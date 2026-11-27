import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import { BookOpen, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

export default function CourseManagementPage() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    department: '',
    level: 'Undergraduate',
    durationYears: 4,
    totalSeats: 60,
    annualFee: 150000,
    description: '',
    minClass10Percentage: 55,
    minClass12Percentage: 60,
    requiredSubjectsStr: 'Mathematics:50, Physics:50',
  });

  const fetchCourses = async () => {
    try {
      const cRes = await api.get('/courses');
      if (cRes.success) setCourses(cRes.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      code: '',
      department: 'Department of Computer Science & Engineering',
      level: 'Undergraduate',
      durationYears: 4,
      totalSeats: 60,
      annualFee: 150000,
      description: '',
      minClass10Percentage: 55,
      minClass12Percentage: 60,
      requiredSubjectsStr: 'Mathematics:50, Physics:50',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    const subStr = course.eligibilityCriteria?.requiredSubjects
      ?.map((s) => `${s.subjectName}:${s.minMarks}`)
      .join(', ') || '';

    setFormData({
      title: course.title,
      code: course.code,
      department: course.department?.name || course.department || 'Department of Computer Science & Engineering',
      level: course.level,
      durationYears: course.durationYears,
      totalSeats: course.totalSeats,
      annualFee: course.annualFee,
      description: course.description,
      minClass10Percentage: course.eligibilityCriteria?.minClass10Percentage ?? 50,
      minClass12Percentage: course.eligibilityCriteria?.minClass12Percentage ?? 55,
      requiredSubjectsStr: subStr,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const existingCriteria = editingCourse?.eligibilityCriteria;
    const parsedSubjects = formData.requiredSubjectsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [name, threshold] = s.split(':').map((part) => part.trim());
        const existing = existingCriteria?.requiredSubjects?.find((subject) =>
          subject.subjectName.trim().toLowerCase() === name.toLowerCase()
        );
        return {
          subjectName: name,
          minMarks: Number(threshold || 40),
          isMandatory: existing?.isMandatory ?? true,
        };
      });

    const payload = {
      title: formData.title,
      code: formData.code,
      department: formData.department,
      level: formData.level,
      durationYears: Number(formData.durationYears),
      totalSeats: Number(formData.totalSeats),
      annualFee: Number(formData.annualFee),
      description: formData.description,
      eligibilityCriteria: {
        ...existingCriteria,
        minClass10Percentage: Number(formData.minClass10Percentage),
        minClass12Percentage: Number(formData.minClass12Percentage),
        requiredSubjects: parsedSubjects,
        requiredDocuments: existingCriteria?.requiredDocuments ?? [
          { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
          { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
        ],
      },
    };

    try {
      if (editingCourse) {
        await api.put(`/courses/${editingCourse._id}`, payload);
      } else {
        await api.post('/courses', payload);
      }
      setShowModal(false);
      fetchCourses();
    } catch (err) {
      alert(err.message || 'Error saving course');
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Delete this course from the catalogue?')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      fetchCourses();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <DashboardLayout roleTitle="SYSTEM ADMINISTRATOR">
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
              Course Catalogue & Eligibility Rules Configuration
            </h1>
            <p className="text-xs text-[#6B716C] mt-1">
              Configure cutoffs, seat allocations, mandatory subjects, and tuition fees across departments.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Academic Program
          </button>
        </div>

        {/* Course Table */}
        <div className="bg-white border border-[#DDDCD5] rounded-lg shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-xs text-[#6B716C]">Loading programs...</div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F7F6F2] text-[#6B716C] font-semibold border-b border-[#DDDCD5]">
                  <tr>
                    <th className="py-2.5 px-4">Code / Title</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4">Duration & Fee</th>
                    <th className="py-2.5 px-4">Seats (Allotted/Total)</th>
                    <th className="py-2.5 px-4">Configured Cutoffs</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEBE4]">
                  {courses.map((course) => (
                    <tr key={course._id} className="hover:bg-[#F7F6F2]/50 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#254D3C] block">{course.code}</span>
                        <span className="font-semibold text-[#252824]">{course.title}</span>
                      </td>
                      <td className="py-3 px-4 text-[#6B716C]">{course.department?.name || course.department || 'General'}</td>
                      <td className="py-3 px-4">
                        <div>{course.durationYears} Years ({course.level})</div>
                        <div className="font-semibold text-[#252824]">₹{course.annualFee?.toLocaleString()}/yr</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#254D3C]">{course.allocatedSeats}</span> / {course.totalSeats}
                      </td>
                      <td className="py-3 px-4">
                        <div>10th: <strong>{course.eligibilityCriteria?.minClass10Percentage}%</strong></div>
                        <div>12th: <strong>{course.eligibilityCriteria?.minClass12Percentage}%</strong></div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(course)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#F7F6F2] hover:bg-[#ECEBE4] text-[#254D3C] rounded border border-[#DDDCD5]"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => handleDelete(course._id)}
                          className="text-[#9E2A2B] hover:text-red-800"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal for Add / Edit Course */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white border border-[#DDDCD5] rounded-lg max-w-xl w-full p-6 shadow-xl relative text-xs">
              <h3 className="font-serif font-bold text-base text-[#254D3C] mb-4">
                {editingCourse ? 'Configure Program & Eligibility' : 'Create Academic Program'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Program Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. B.Tech in Cyber Security"
                      className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Program Code</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. BTECH-CS"
                      className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Department</label>
                    <input
                      type="text"
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g. Department of Computer Science & Engineering"
                      className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Total Seats</label>
                    <input
                      type="number"
                      required
                      value={formData.totalSeats}
                      onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                      className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Annual Fee (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.annualFee}
                      onChange={(e) => setFormData({ ...formData, annualFee: e.target.value })}
                      className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#F7F6F2] border border-[#DDDCD5] rounded space-y-2">
                  <span className="font-bold text-[#254D3C] block uppercase text-[10px]">
                    Configurable Eligibility Criteria Engine
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1">Min Class 10th %</label>
                      <input
                        type="number"
                        value={formData.minClass10Percentage}
                        onChange={(e) => setFormData({ ...formData, minClass10Percentage: e.target.value })}
                        className="w-full p-1.5 border border-[#DDDCD5] rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Min Class 12th %</label>
                      <input
                        type="number"
                        value={formData.minClass12Percentage}
                        onChange={(e) => setFormData({ ...formData, minClass12Percentage: e.target.value })}
                        className="w-full p-1.5 border border-[#DDDCD5] rounded bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Mandatory Class 12 Subjects & Minimum Score (Format: Name:MinMarks)
                    </label>
                    <input
                      type="text"
                      value={formData.requiredSubjectsStr}
                      onChange={(e) => setFormData({ ...formData, requiredSubjectsStr: e.target.value })}
                      placeholder="e.g. Mathematics:55, Physics:50"
                      className="w-full p-1.5 border border-[#DDDCD5] rounded bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Program Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-[#DDDCD5]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-1.5 border border-[#DDDCD5] rounded hover:bg-[#F7F6F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#254D3C] text-white font-semibold rounded hover:bg-[#1c3b2e]"
                  >
                    Save Program
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
