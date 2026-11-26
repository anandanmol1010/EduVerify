import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Filter, ArrowRight } from 'lucide-react';

export default function CoursesCataloguePage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses');
        if (res.success) {
          setCourses(res.courses);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = level === 'all' || c.level === level;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#254D3C]">
          Available Courses
        </h1>
        <p className="text-xs text-[#6B716C] mt-1">
          Explore degree programs, seat availability, fees, and eligibility criteria for session 2026–2027.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded border border-[#DDDCD5] flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B716C]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course name or code (e.g. B.Tech, CSE, BBA)..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#6B716C]" />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="text-xs p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
          >
            <option value="all">All Degree Levels</option>
            <option value="Undergraduate">Undergraduate</option>
            <option value="Postgraduate">Postgraduate</option>
          </select>
        </div>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-[#6B716C]">Loading courses...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#DDDCD5] rounded p-8">
          <p className="text-xs text-[#6B716C]">No courses match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => {
            const seatsLeft = course.totalSeats - course.allocatedSeats;
            const crit = course.eligibilityCriteria;

            return (
              <div
                key={course._id}
                className="bg-white border border-[#DDDCD5] rounded-lg p-6 flex flex-col justify-between hover:border-[#254D3C] transition shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#6B716C] mb-2">
                    <span className="font-mono font-bold text-[#254D3C] px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#DDDCD5]">
                      {course.code}
                    </span>
                    <span className="text-[11px] font-semibold">{course.durationYears} Years • {course.level}</span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#252824] mb-2 leading-snug">
                    {course.title}
                  </h3>

                  <p className="text-xs text-[#6B716C] leading-relaxed line-clamp-3 mb-4">
                    {course.description}
                  </p>

                  {/* Eligibility Criteria Box */}
                  <div className="bg-[#F7F6F2] p-3 rounded border border-[#DDDCD5] text-[11px] space-y-1 mb-4">
                    <div className="font-semibold text-[#252824] mb-1">Minimum Requirements:</div>
                    <div className="text-[#6B716C] flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#254D3C] mr-1.5"></span>
                      Class 10: <strong className="ml-1 text-[#252824]">{crit?.minClass10Percentage}% aggregate</strong>
                    </div>
                    <div className="text-[#6B716C] flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#254D3C] mr-1.5"></span>
                      Class 12: <strong className="ml-1 text-[#252824]">{crit?.minClass12Percentage}% aggregate</strong>
                    </div>
                    {crit?.requiredSubjects && crit.requiredSubjects.length > 0 && (
                      <div className="text-[#6B716C] pt-1">
                        Mandatory Subjects:{' '}
                        <span className="text-[#252824] font-medium">
                          {crit.requiredSubjects.map((s) => s.subjectName).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#ECEBE4] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-[#6B716C] block">Annual Fee</span>
                      <span className="font-bold text-[#252824]">₹{course.annualFee?.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#6B716C] block">Seats Available</span>
                      <span className={`font-bold ${seatsLeft > 0 ? 'text-[#2B6E4E]' : 'text-[#9E2A2B]'}`}>
                        {seatsLeft > 0 ? `${seatsLeft} of ${course.totalSeats} seats` : 'Admissions Full'}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/student/applications/new?courseId=${course._id}`}
                    className="w-full py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] transition flex items-center justify-center shadow-sm"
                  >
                    Apply for this Course
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
