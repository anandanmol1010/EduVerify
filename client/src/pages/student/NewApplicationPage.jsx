import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/DashboardLayout';
import DigiLockerModal from '../../components/DigiLockerModal';
import StatusBadge from '../../components/StatusBadge';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  Info,
  UserCheck,
} from 'lucide-react';
import {
  mapDigiLockerAcademicData,
  detectPersonalConflicts,
  mergePersonalDetails,
  calculateAggregatePercentage,
  computeAcademicProgress,
} from '../../services/documentMapper';

export default function NewApplicationPage() {
  const { key } = useLocation();
  return <ApplicationForm key={key} />;
}

function ApplicationForm() {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';
  const existingAppId = searchParams.get('appId') || '';

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isDigiLockerOpen, setIsDigiLockerOpen] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const currentAppId = existingAppId || undefined;
  const [workspaceId] = useState(() => crypto.randomUUID());
  const documentParams = currentAppId ? { applicationId: currentAppId } : { workspaceId };

  // DigiLocker Connection & Extraction State
  const [digiLockerConnected, setDigiLockerConnected] = useState(false);
  const [importedCandidateName, setImportedCandidateName] = useState('');
  const [importNotice, setImportNotice] = useState(null);

  // Personal Conflict Resolution Modal State
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState([]);
  const [pendingImportResult, setPendingImportResult] = useState(null);
  const [conflictDecisions, setConflictDecisions] = useState({});

  const navigate = useNavigate();

  // Stage 1: Personal Info Form State (Defaults to blank/clean state; no auto-selection of gender or category)
  const [personal, setPersonal] = useState({
    fullName: '',
    dob: '',
    gender: '', // Unselected initially
    category: '', // Unselected initially
    categoryCertificateNumber: '',
    nationality: 'Indian',
    hasDisability: false,
    disabilityDetails: '',
    disabilityCertificateNumber: '',
    email: '',
    phone: '',
    altPhone: '',
    fatherName: '',
    motherName: '',
    hasGuardian: false,
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '',
    permanentAddress: {
      street: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    correspondenceAddress: {
      street: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    isSameAddress: true,
  });

  // Stage 2: Academic Details Form State — Initially ALL fields empty
  const [academic, setAcademic] = useState({
    class10: {
      board: '',
      rollNumber: '',
      schoolName: '',
      passingYear: '',
      percentage: '',
      subjects: [],
      isImported: false,
    },
    class12: {
      board: '',
      rollNumber: '',
      schoolName: '',
      passingYear: '',
      stream: '',
      percentage: '',
      subjects: [],
      isImported: false,
    },
    fieldMeta: {},
    discrepancies: [],
  });

  // Uploaded / Attached Documents
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [uploadingDocType, setUploadingDocType] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [courseRes, userRes, docRes] = await Promise.all([
          api.get('/courses'),
          api.get('/auth/me'),
          api.get('/documents/my-documents', { params: documentParams }),
        ]);

        let loadedCourses = [];
        if (courseRes.success) {
          loadedCourses = courseRes.courses;
          setCourses(loadedCourses);
        }

        // If existing draft application ID passed, load draft data
        if (existingAppId) {
          try {
            const appRes = await api.get(`/applications/${existingAppId}`);
            if (appRes.success && appRes.application) {
              const draft = appRes.application;
              if (draft.course) {
                const matched = loadedCourses.find((c) => c._id === (draft.course._id || draft.course));
                if (matched) setSelectedCourse(matched);
              }
              if (draft.personalSnapshot) {
                setPersonal((prev) => ({
                  ...prev,
                  ...draft.personalSnapshot,
                  permanentAddress: {
                    ...prev.permanentAddress,
                    ...(draft.personalSnapshot.permanentAddress || {}),
                  },
                  correspondenceAddress: {
                    ...prev.correspondenceAddress,
                    ...(draft.personalSnapshot.correspondenceAddress || {}),
                  },
                }));
              }
              if (draft.academicSnapshot) {
                setAcademic((prev) => ({
                  ...prev,
                  ...draft.academicSnapshot,
                  fieldMeta: draft.academicSnapshot.fieldMeta || {},
                  discrepancies: draft.academicSnapshot.discrepancies || [],
                }));
                if (draft.academicSnapshot.fieldMeta && Object.values(draft.academicSnapshot.fieldMeta).includes('imported')) {
                  setDigiLockerConnected(true);
                  setImportNotice({
                    title: 'Academic information imported',
                    subtitle: 'Complete the remaining required fields before continuing.',
                  });
                }
              }
            }
          } catch (appErr) {
            console.error('Failed to load existing draft application:', appErr);
          }
        } else {
          // New application initialization: select course from query param or first course
          if (initialCourseId && loadedCourses.length > 0) {
            const match = loadedCourses.find((c) => c._id === initialCourseId);
            if (match) setSelectedCourse(match);
          } else if (loadedCourses.length > 0) {
            setSelectedCourse(loadedCourses[0]);
          }

          // Pre-populate verified contact information from user account
          if (userRes.success && userRes.user) {
            setPersonal((prev) => ({
              ...prev,
              fullName: prev.fullName || userRes.user.name || '',
              email: prev.email || userRes.user.email || '',
              phone: prev.phone || userRes.user.phone || '',
            }));
          }
        }

        if (docRes.success) {
          setAttachedDocs(docRes.documents);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    init();
  }, [initialCourseId, existingAppId]);

  const fetchDocuments = () => api.get('/documents/my-documents', { params: documentParams });

  // Handle Permanent Address Change with Auto-Sync to Correspondence if checked
  const handlePermanentAddressChange = (field, value) => {
    setPersonal((prev) => {
      const updatedPerm = { ...prev.permanentAddress, [field]: value };
      const updatedCorr = prev.isSameAddress ? { ...updatedPerm } : prev.correspondenceAddress;
      return {
        ...prev,
        permanentAddress: updatedPerm,
        correspondenceAddress: updatedCorr,
      };
    });
  };

  const handleCorrespondenceAddressChange = (field, value) => {
    setPersonal((prev) => ({
      ...prev,
      correspondenceAddress: {
        ...prev.correspondenceAddress,
        [field]: value,
      },
    }));
  };

  const handleSameAddressToggle = (checked) => {
    setPersonal((prev) => ({
      ...prev,
      isSameAddress: checked,
      correspondenceAddress: checked ? { ...prev.permanentAddress } : prev.correspondenceAddress,
    }));
  };

  // Recalculate Class 12 percentages dynamically when subject marks change
  const handle12thSubjectChange = (index, field, value) => {
    const updated = [...(academic.class12.subjects || [])];
    updated[index] = { ...updated[index], [field]: value };
    const autoPct = calculateAggregatePercentage(updated);
    setAcademic((prev) => ({
      ...prev,
      class12: {
        ...prev.class12,
        subjects: updated,
        percentage: autoPct > 0 ? autoPct : prev.class12.percentage,
      },
    }));
  };

  const add12thSubject = () => {
    setAcademic((prev) => ({
      ...prev,
      class12: {
        ...prev.class12,
        subjects: [...(prev.class12.subjects || []), { subjectName: '', marksObtained: '', maxMarks: 100, source: 'manual' }],
      },
    }));
  };

  const remove12thSubject = (index) => {
    const updated = academic.class12.subjects.filter((_, i) => i !== index);
    const autoPct = calculateAggregatePercentage(updated);
    setAcademic((prev) => ({
      ...prev,
      class12: {
        ...prev.class12,
        subjects: updated,
        percentage: autoPct > 0 ? autoPct : prev.class12.percentage,
      },
    }));
  };

  // Handle DigiLocker Auto Fill & Conflict Detection
  const handleDigiLockerImportSuccess = (result) => {
    const details = result.importedAcademicDetails;
    if (!details) return;

    setDigiLockerConnected(true);
    setImportedCandidateName(details.candidateName || '');

    // Map academic details
    const mapped = mapDigiLockerAcademicData(details, academic);
    setAcademic((prev) => ({
      ...prev,
      ...mapped.academic,
      fieldMeta: { ...prev.fieldMeta, ...mapped.fieldMeta },
    }));

    // Show import notice banner matching screenshot
    setImportNotice({
      title: 'Academic information imported',
      subtitle: 'Complete the remaining required fields before continuing.',
    });

    // Check for conflicts in personal details
    const conflicts = detectPersonalConflicts(personal, details);
    if (conflicts.length > 0) {
      setDetectedConflicts(conflicts);
      setPendingImportResult(details);
      // Initialize default decisions to keep imported
      const initialDecisions = {};
      conflicts.forEach((c) => {
        initialDecisions[c.field] = 'imported';
      });
      setConflictDecisions(initialDecisions);
      setConflictModalOpen(true);
    } else {
      // Safely merge personal details without overwriting existing entries
      const merged = mergePersonalDetails(personal, details, {});
      setPersonal(merged.personal);
    }

    // Refresh documents list
    fetchDocuments().then((d) => {
      if (d.success) setAttachedDocs(d.documents);
    });
  };

  // Resolve Personal Details Conflicts Modal Action
  const handleResolveConflicts = () => {
    if (!pendingImportResult) {
      setConflictModalOpen(false);
      return;
    }

    const merged = mergePersonalDetails(personal, pendingImportResult, conflictDecisions);
    setPersonal(merged.personal);

    // Preserve the applicant's conflict resolution in the draft.
    const loggedDiscrepancies = detectedConflicts.map((c) => ({
      field: c.field,
      enteredValue: String(c.currentValue),
      importedValue: String(c.importedValue),
      source: 'DigiLocker Demo',
      resolved: conflictDecisions[c.field] !== 'keep',
    }));

    setAcademic((prev) => ({
      ...prev,
      discrepancies: [...(prev.discrepancies || []), ...loggedDiscrepancies],
    }));

    setConflictModalOpen(false);
    setPendingImportResult(null);
  };

  // Stage 1 Validation
  const validateStage1 = () => {
    const errs = {};
    if (!selectedCourse) errs.course = 'Please select a course.';
    if (!personal.fullName?.trim()) errs.fullName = 'Full legal name is required.';
    if (!personal.dob) errs.dob = 'Date of birth is required.';
    if (!personal.gender) errs.gender = 'Please select your gender.';
    if (!personal.category) errs.category = 'Please select your category.';
    if (!personal.nationality?.trim()) errs.nationality = 'Nationality is required.';

    if (personal.category && personal.category !== 'General' && !personal.categoryCertificateNumber?.trim()) {
      errs.categoryCertificateNumber = `${personal.category} certificate number is required for verification.`;
    }

    if (personal.hasDisability) {
      if (!personal.disabilityDetails?.trim()) errs.disabilityDetails = 'Please specify disability nature and percentage.';
      if (!personal.disabilityCertificateNumber?.trim()) errs.disabilityCertificateNumber = 'Disability certificate number is required.';
    }

    if (!personal.email?.trim() || !/^\S+@\S+\.\S+$/.test(personal.email)) {
      errs.email = 'A valid email address is required.';
    }
    if (!personal.phone?.trim() || !/^\+?[0-9]{10,12}$/.test(personal.phone.replace(/[\s-]/g, ''))) {
      errs.phone = 'A valid 10-digit mobile number is required.';
    }

    if (!personal.fatherName?.trim()) errs.fatherName = "Father's full name is required.";
    if (!personal.motherName?.trim()) errs.motherName = "Mother's full name is required.";

    if (personal.hasGuardian) {
      if (!personal.guardianName?.trim()) errs.guardianName = "Guardian's name is required.";
      if (!personal.guardianPhone?.trim()) errs.guardianPhone = "Guardian's phone number is required.";
      if (!personal.guardianRelationship?.trim()) errs.guardianRelationship = 'Relationship with guardian is required.';
    }

    // Permanent address
    const pa = personal.permanentAddress || {};
    if (!pa.street?.trim()) errs.permStreet = 'Street / House No is required.';
    if (!pa.city?.trim()) errs.permCity = 'City is required.';
    if (!pa.district?.trim()) errs.permDistrict = 'District is required.';
    if (!pa.state?.trim()) errs.permState = 'State is required.';
    if (!pa.pincode?.trim() || !/^\d{6}$/.test(pa.pincode.trim())) {
      errs.permPincode = 'A valid 6-digit PIN code is required.';
    }

    // Correspondence address if different
    if (!personal.isSameAddress) {
      const ca = personal.correspondenceAddress || {};
      if (!ca.street?.trim()) errs.corrStreet = 'Street / House No is required.';
      if (!ca.city?.trim()) errs.corrCity = 'City is required.';
      if (!ca.district?.trim()) errs.corrDistrict = 'District is required.';
      if (!ca.state?.trim()) errs.corrState = 'State is required.';
      if (!ca.pincode?.trim() || !/^\d{6}$/.test(ca.pincode.trim())) {
        errs.corrPincode = 'A valid 6-digit PIN code is required.';
      }
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Stage 2 Validation
  const validateStage2 = () => {
    const errs = {};
    const c10 = academic.class10 || {};
    const c12 = academic.class12 || {};

    if (!c10.board?.trim()) errs.c10Board = 'Class 10th Board Name is required.';
    if (!c10.rollNumber?.trim()) errs.c10Roll = 'Class 10th Roll Number is required.';
    if (!c10.passingYear) errs.c10Year = 'Class 10th Passing Year is required.';
    if (c10.percentage === '' || isNaN(Number(c10.percentage))) errs.c10Pct = 'Class 10th Aggregate Percentage is required.';
    if (!c10.schoolName?.trim()) errs.c10School = 'Class 10th School Name is required.';

    if (!c12.board?.trim()) errs.c12Board = 'Class 12th Board Name is required.';
    if (!c12.rollNumber?.trim()) errs.c12Roll = 'Class 12th Roll Number is required.';
    if (!c12.passingYear) errs.c12Year = 'Class 12th Passing Year is required.';
    if (c12.percentage === '' || isNaN(Number(c12.percentage))) errs.c12Pct = 'Class 12th Aggregate Percentage is required.';
    if (!c12.schoolName?.trim()) errs.c12School = 'Class 12th School Name is required.';

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Upload an individual document from the checklist
  const handleIndividualUpload = async (docType, docName, file) => {
    if (!file) return;
    setUploadingDocType(docType);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      formData.append('title', docName);
      for (const [key, value] of Object.entries(documentParams)) formData.append(key, value);
      const marksheet = docType === 'class10_marksheet' ? academic.class10
        : docType === 'class12_marksheet' ? academic.class12 : null;
      if (marksheet) {
        formData.append('rollNumber', marksheet.rollNumber || '');
        formData.append('passingYear', marksheet.passingYear || '');
        formData.append('percentage', marksheet.percentage ?? '');
      }
      formData.append('candidateName', personal.fullName);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success) {
        const dRes = await fetchDocuments();
        if (dRes.success) setAttachedDocs(dRes.documents);
        if (res.mismatches?.length) setError(res.mismatches.join(' '));
      }
    } catch (err) {
      setError(err.message || `Failed to upload ${docName}`);
    } finally {
      setUploadingDocType(null);
    }
  };

  // Remove document
  const handleRemoveDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this document?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      const dRes = await fetchDocuments();
      if (dRes.success) setAttachedDocs(dRes.documents);
    } catch (err) {
      alert(err.message || 'Failed to remove document');
    }
  };

  // Checklist computation based on Course configuration
  // Aadhaar Demo Identity Document is Mandatory for admission
  const courseRequiredDocs = selectedCourse?.eligibilityCriteria?.requiredDocuments || [
    { docType: 'aadhaar_card', docName: 'Aadhaar Demo Identity Document', isMandatory: true },
    { docType: 'class10_marksheet', docName: 'Class 10th Marksheet', isMandatory: true },
    { docType: 'class12_marksheet', docName: 'Class 12th Marksheet', isMandatory: true },
    { docType: 'passing_certificate', docName: 'Passing Certificate', isMandatory: true },
  ];

  const standardDocumentTypes = [
    { docType: 'aadhaar_card', docName: 'Aadhaar Demo Identity Document', isMandatory: true },
    { docType: 'class10_marksheet', docName: 'Class 10 Marksheet', isMandatory: true },
    { docType: 'class12_marksheet', docName: 'Class 12 Marksheet', isMandatory: true },
    { docType: 'student_photo', docName: 'Student Photograph', isMandatory: false },
    { docType: 'migration_certificate', docName: 'Migration Certificate', isMandatory: false },
    { docType: 'transfer_certificate', docName: 'Transfer Certificate', isMandatory: false },
    { docType: 'category_certificate', docName: 'Category / Caste Certificate', isMandatory: personal.category && personal.category !== 'General' },
    { docType: 'disability_certificate', docName: 'PwD Disability Certificate', isMandatory: personal.hasDisability },
  ];

  const fullChecklist = courseRequiredDocs.map((doc) => ({ ...doc }));
  standardDocumentTypes.forEach((std) => {
    const configured = fullChecklist.find((doc) => doc.docType === std.docType);
    if (configured) configured.isMandatory ||= std.isMandatory;
    else fullChecklist.push(std);
  });

  const checklistDocuments = fullChecklist.map(({ docType }) =>
    attachedDocs.find((doc) => doc.docType === docType &&
      (currentAppId ? doc.application === currentAppId : !doc.application && doc.workspaceId === workspaceId))
  ).filter(Boolean);
  const mandatoryCount = fullChecklist.filter((doc) => doc.isMandatory).length;
  const submittedMandatoryCount = fullChecklist.filter(
    (doc) => doc.isMandatory && checklistDocuments.some((attached) => attached.docType === doc.docType)
  ).length;
  const missingMandatoryCount = mandatoryCount - submittedMandatoryCount;

  const handleCheckEligibility = async (academicOnly = false) => {
    if (!selectedCourse) return;
    if (academicOnly && !validateStage2()) {
      setError('Please fill in all mandatory Class 10 and Class 12 academic fields.');
      return;
    }
    setLoading(true);
    setEvaluation(null);
    setError('');

    try {
      const res = await api.post('/applications/check-eligibility', {
        courseId: selectedCourse._id,
        academic10th: academic.class10,
        academic12th: academic.class12,
        academicOnly,
        personalSnapshot: personal,
        ...documentParams,
        documentIds: checklistDocuments.map((doc) => doc._id),
      });
      if (academicOnly) {
        if (res.evaluation.isEligible) setStep(3);
        else setError(`Academic eligibility: ${res.evaluation.status}. ${res.evaluation.rulesFailed.join(' ')}`);
      } else {
        setEvaluation(res.evaluation);
        setStep(4);
      }
    } catch (err) {
      setError(err.message || 'Error running eligibility check');
    } finally {
      setLoading(false);
    }
  };

  // Submit or Save Draft Application
  const handleSubmitApplication = async (isDraft = false) => {
    setLoading(true);
    setError('');

    if (!isDraft && !evaluation?.canSubmit) {
      setLoading(false);
      setError('Resolve the eligibility and document issues before submitting.');
      return;
    }

    try {
      let res;
      const payload = {
        courseId: selectedCourse._id,
        personalSnapshot: personal,
        academicSnapshot: academic,
        documentIds: checklistDocuments.map((doc) => doc._id),
        isDraft,
        workspaceId: currentAppId ? undefined : workspaceId,
      };

      if (currentAppId) {
        res = await api.put(`/applications/${currentAppId}`, {
          ...payload,
          submitNow: !isDraft,
        });
      } else {
        res = await api.post('/applications', payload);
      }

      if (res.success) {
        navigate(`/student/applications/${res.application?._id || currentAppId}`);
      }
    } catch (err) {
      if (err.evaluation) setEvaluation(err.evaluation);
      setError(err.message || 'Failed to submit admission application.');
    } finally {
      setLoading(false);
    }
  };

  const progress = computeAcademicProgress(academic, academic.fieldMeta || {});

  return (
    <DashboardLayout roleTitle="STUDENT">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#254D3C]">
            New Admission Application
          </h1>
          <p className="text-xs text-[#6B716C] mt-1">
            Complete your admission application in 4 straightforward stages. You can enter details manually or auto-fill with the demo document locker.
          </p>
        </div>

        {/* Progress Tracker Bar */}
        <div className="bg-white p-3.5 rounded border border-[#DDDCD5] grid grid-cols-4 gap-2 text-center text-xs">
          <div className={`p-2 rounded font-medium ${step === 1 ? 'bg-[#254D3C] text-white font-semibold' : 'text-[#6B716C]'}`}>
            1. Course & Personal
          </div>
          <div className={`p-2 rounded font-medium ${step === 2 ? 'bg-[#254D3C] text-white font-semibold' : 'text-[#6B716C]'}`}>
            2. Academic Details
          </div>
          <div className={`p-2 rounded font-medium ${step === 3 ? 'bg-[#254D3C] text-white font-semibold' : 'text-[#6B716C]'}`}>
            3. Required Documents
          </div>
          <div className={`p-2 rounded font-medium ${step === 4 ? 'bg-[#254D3C] text-white font-semibold' : 'text-[#6B716C]'}`}>
            4. Review & Submit
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 1: Course Selection and Personal Details                            */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-8">
            <div className="border-b border-[#ECEBE4] pb-3">
              <h2 className="font-serif font-bold text-lg text-[#254D3C]">
                Stage 1: Course Selection & Personal Details
              </h2>
              <p className="text-xs text-[#6B716C] mt-0.5">
                Review your course requirements and complete your official personal, contact, and address profile.
              </p>
            </div>

            {/* Section A: Course Selection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#254D3C]"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#254D3C]">
                  Section A: Course Selection
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252824] mb-1">
                  Selected Course or Program <span className="text-[#9E2A2B]">*</span>
                </label>
                <select
                  value={selectedCourse?._id || ''}
                  disabled={Boolean(currentAppId)}
                  onChange={(e) => {
                    const match = courses.find((c) => c._id === e.target.value);
                    setSelectedCourse(match);
                  }}
                  className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title} ({c.code}) — {c.level}
                    </option>
                  ))}
                </select>
                {validationErrors.course && (
                  <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.course}</p>
                )}
              </div>

              {selectedCourse && (
                <div className="p-4 bg-[#F7F6F2] border border-[#DDDCD5] rounded space-y-2 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[#6B716C] block text-[11px]">Department:</span>
                      <strong className="text-[#252824]">{selectedCourse.department?.name || 'Department Division'}</strong>
                    </div>
                    <div>
                      <span className="text-[#6B716C] block text-[11px]">Academic Session:</span>
                      <strong className="text-[#252824]">2026 – 2027</strong>
                    </div>
                    <div>
                      <span className="text-[#6B716C] block text-[11px]">Course Duration & Level:</span>
                      <strong className="text-[#252824]">{selectedCourse.durationYears} Years ({selectedCourse.level})</strong>
                    </div>
                    <div>
                      <span className="text-[#6B716C] block text-[11px]">Annual Tuition Fee:</span>
                      <strong className="text-[#254D3C]">₹{selectedCourse.annualFee?.toLocaleString()} / year</strong>
                    </div>
                    <div>
                      <span className="text-[#6B716C] block text-[11px]">Seats Availability:</span>
                      <strong className="text-[#252824]">
                        {selectedCourse.totalSeats - selectedCourse.allocatedSeats} seats available ({selectedCourse.totalSeats} total)
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#6B716C] block text-[11px]">Minimum Cutoffs:</span>
                      <strong className="text-[#252824]">
                        Class 10: {selectedCourse.eligibilityCriteria?.minClass10Percentage}% | Class 12: {selectedCourse.eligibilityCriteria?.minClass12Percentage}%
                      </strong>
                    </div>
                  </div>

                  {selectedCourse.eligibilityCriteria?.requiredSubjects?.length > 0 && (
                    <div className="pt-2 border-t border-[#DDDCD5] text-[11px]">
                      <span className="text-[#6B716C] font-semibold">Subject Requirements: </span>
                      <div className="inline-flex flex-wrap gap-1.5 mt-1">
                        {selectedCourse.eligibilityCriteria.requiredSubjects.map((sub, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              sub.isMandatory
                                ? 'bg-emerald-50 text-[#254D3C] border border-emerald-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {sub.subjectName} ({sub.isMandatory ? 'Mandatory' : 'Optional'}, Min {sub.minMarks}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section B: Personal Information */}
            <div className="space-y-4 pt-4 border-t border-[#ECEBE4]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#254D3C]"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#254D3C]">
                    Section B: Personal Information
                  </h3>
                </div>
                {digiLockerConnected ? (
                  <div className="inline-flex items-center px-2.5 py-1 bg-[#254D3C] text-white text-[11px] font-semibold rounded shadow-sm">
                    <Check className="w-3 h-3 mr-1" strokeWidth={3} />
                    DigiLocker Demo Connected
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDigiLockerOpen(true)}
                    className="px-3 py-1.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Connect to DigiLocker Demo
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Full Legal Name <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aarav Sharma"
                    value={personal.fullName}
                    onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.fullName ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  />
                  {validationErrors.fullName && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Date of Birth <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <input
                    type="date"
                    value={personal.dob ? personal.dob.split('T')[0] : ''}
                    onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.dob ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  />
                  {validationErrors.dob && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.dob}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Gender <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <select
                    value={personal.gender}
                    onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.gender ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {validationErrors.gender && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.gender}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Category <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <select
                    value={personal.category}
                    onChange={(e) => setPersonal({ ...personal, category: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.category ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  >
                    <option value="">-- Select Category --</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC (Other Backward Classes)</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="EWS">EWS (Economically Weaker Section)</option>
                  </select>
                  {validationErrors.category && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Nationality <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={personal.nationality}
                    onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.nationality ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  />
                  {validationErrors.nationality && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.nationality}</p>
                  )}
                </div>

                {personal.category && personal.category !== 'General' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#252824] mb-1">
                      {personal.category} Certificate Number <span className="text-[#9E2A2B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OBC-2024-98421"
                      value={personal.categoryCertificateNumber}
                      onChange={(e) => setPersonal({ ...personal, categoryCertificateNumber: e.target.value })}
                      className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                        validationErrors.categoryCertificateNumber ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                      }`}
                    />
                    {validationErrors.categoryCertificateNumber && (
                      <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.categoryCertificateNumber}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Disability Status */}
              <div className="p-3 bg-[#F7F6F2] border border-[#DDDCD5] rounded space-y-3">
                <label className="inline-flex items-center text-xs font-semibold text-[#252824] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={personal.hasDisability}
                    onChange={(e) => setPersonal({ ...personal, hasDisability: e.target.checked })}
                    className="w-4 h-4 text-[#254D3C] rounded border-gray-300 focus:ring-[#254D3C]"
                  />
                  <span className="ml-2">Person with Benchmark Disability (PwD) Candidate</span>
                </label>

                {personal.hasDisability && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#DDDCD5]">
                    <div>
                      <label className="block text-xs font-semibold text-[#252824] mb-1">
                        Disability Details (Nature & Percentage) <span className="text-[#9E2A2B]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Locomotor Disability, 40%"
                        value={personal.disabilityDetails}
                        onChange={(e) => setPersonal({ ...personal, disabilityDetails: e.target.value })}
                        className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                      />
                      {validationErrors.disabilityDetails && (
                        <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.disabilityDetails}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#252824] mb-1">
                        Disability Certificate Number <span className="text-[#9E2A2B]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PWD-DL-2023-7761"
                        value={personal.disabilityCertificateNumber}
                        onChange={(e) => setPersonal({ ...personal, disabilityCertificateNumber: e.target.value })}
                        className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                      />
                      {validationErrors.disabilityCertificateNumber && (
                        <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.disabilityCertificateNumber}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section C: Contact Information */}
            <div className="space-y-4 pt-4 border-t border-[#ECEBE4]">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#254D3C]"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#254D3C]">
                  Section C: Contact Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Email Address <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={personal.email}
                    onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.email ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  />
                  {validationErrors.email && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Mobile Number <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={personal.phone}
                    onChange={(e) => setPersonal({ ...personal, phone: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.phone ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  />
                  {validationErrors.phone && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Alternate Mobile Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={personal.altPhone}
                    onChange={(e) => setPersonal({ ...personal, altPhone: e.target.value })}
                    className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                  />
                </div>
              </div>
            </div>

            {/* Section D: Parent or Guardian Details */}
            <div className="space-y-4 pt-4 border-t border-[#ECEBE4]">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#254D3C]"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#254D3C]">
                  Section D: Parent or Guardian Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Father's Full Name <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={personal.fatherName}
                    onChange={(e) => setPersonal({ ...personal, fatherName: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.fatherName ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  />
                  {validationErrors.fatherName && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.fatherName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252824] mb-1">
                    Mother's Full Name <span className="text-[#9E2A2B]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sunita Sharma"
                    value={personal.motherName}
                    onChange={(e) => setPersonal({ ...personal, motherName: e.target.value })}
                    className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C] ${
                      validationErrors.motherName ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                    }`}
                  />
                  {validationErrors.motherName && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.motherName}</p>
                  )}
                </div>
              </div>

              {/* Guardian Option */}
              <div className="p-3 bg-[#F7F6F2] border border-[#DDDCD5] rounded space-y-3">
                <label className="inline-flex items-center text-xs font-semibold text-[#252824] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={personal.hasGuardian}
                    onChange={(e) => setPersonal({ ...personal, hasGuardian: e.target.checked })}
                    className="w-4 h-4 text-[#254D3C] rounded border-gray-300 focus:ring-[#254D3C]"
                  />
                  <span className="ml-2">Add Legal Guardian Details (if different from parents)</span>
                </label>

                {personal.hasGuardian && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#DDDCD5]">
                    <div>
                      <label className="block text-xs font-semibold text-[#252824] mb-1">
                        Guardian Full Name <span className="text-[#9E2A2B]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. K. N. Verma"
                        value={personal.guardianName}
                        onChange={(e) => setPersonal({ ...personal, guardianName: e.target.value })}
                        className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                      />
                      {validationErrors.guardianName && (
                        <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.guardianName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#252824] mb-1">
                        Guardian Phone Number <span className="text-[#9E2A2B]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98765 00000"
                        value={personal.guardianPhone}
                        onChange={(e) => setPersonal({ ...personal, guardianPhone: e.target.value })}
                        className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                      />
                      {validationErrors.guardianPhone && (
                        <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.guardianPhone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#252824] mb-1">
                        Relationship with Applicant <span className="text-[#9E2A2B]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Uncle / Aunt / Local Guardian"
                        value={personal.guardianRelationship}
                        onChange={(e) => setPersonal({ ...personal, guardianRelationship: e.target.value })}
                        className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                      />
                      {validationErrors.guardianRelationship && (
                        <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.guardianRelationship}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section E: Address Details */}
            <div className="space-y-4 pt-4 border-t border-[#ECEBE4]">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#254D3C]"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#254D3C]">
                  Section E: Address Details
                </h3>
              </div>

              {/* Permanent Address */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#252824]">Permanent Residential Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-[#252824] mb-1">
                      Street / House No / Locality <span className="text-[#9E2A2B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 402, Pine Grove Residency, Civil Lines"
                      value={personal.permanentAddress?.street || ''}
                      onChange={(e) => handlePermanentAddressChange('street', e.target.value)}
                      className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] ${
                        validationErrors.permStreet ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                      }`}
                    />
                    {validationErrors.permStreet && (
                      <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.permStreet}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#252824] mb-1">
                      City / Town <span className="text-[#9E2A2B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. New Delhi"
                      value={personal.permanentAddress?.city || ''}
                      onChange={(e) => handlePermanentAddressChange('city', e.target.value)}
                      className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] ${
                        validationErrors.permCity ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                      }`}
                    />
                    {validationErrors.permCity && (
                      <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.permCity}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#252824] mb-1">
                      District <span className="text-[#9E2A2B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. North West Delhi"
                      value={personal.permanentAddress?.district || ''}
                      onChange={(e) => handlePermanentAddressChange('district', e.target.value)}
                      className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] ${
                        validationErrors.permDistrict ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                      }`}
                    />
                    {validationErrors.permDistrict && (
                      <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.permDistrict}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#252824] mb-1">
                      State / Union Territory <span className="text-[#9E2A2B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi"
                      value={personal.permanentAddress?.state || ''}
                      onChange={(e) => handlePermanentAddressChange('state', e.target.value)}
                      className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] ${
                        validationErrors.permState ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                      }`}
                    />
                    {validationErrors.permState && (
                      <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.permState}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#252824] mb-1">
                      PIN Code (6 Digits) <span className="text-[#9E2A2B]">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 110085"
                      value={personal.permanentAddress?.pincode || ''}
                      onChange={(e) => handlePermanentAddressChange('pincode', e.target.value)}
                      className={`w-full text-xs p-2 border rounded bg-[#F7F6F2] ${
                        validationErrors.permPincode ? 'border-[#9E2A2B]' : 'border-[#DDDCD5]'
                      }`}
                    />
                    {validationErrors.permPincode && (
                      <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.permPincode}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#252824] mb-1">
                      Country <span className="text-[#9E2A2B]">*</span>
                    </label>
                    <input
                      type="text"
                      value={personal.permanentAddress?.country || 'India'}
                      onChange={(e) => handlePermanentAddressChange('country', e.target.value)}
                      className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-[#F7F6F2]"
                    />
                  </div>
                </div>
              </div>

              {/* Correspondence Address Toggle */}
              <div className="pt-2">
                <label className="inline-flex items-center text-xs font-semibold text-[#252824] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={personal.isSameAddress}
                    onChange={(e) => handleSameAddressToggle(e.target.checked)}
                    className="w-4 h-4 text-[#254D3C] rounded border-gray-300 focus:ring-[#254D3C]"
                  />
                  <span className="ml-2">Correspondence address is same as permanent address</span>
                </label>

                {!personal.isSameAddress && (
                  <div className="mt-4 p-4 bg-[#F7F6F2] border border-[#DDDCD5] rounded space-y-3">
                    <h4 className="text-xs font-bold text-[#252824]">Correspondence / Mailing Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-[#252824] mb-1">
                          Street / House No / Locality <span className="text-[#9E2A2B]">*</span>
                        </label>
                        <input
                          type="text"
                          value={personal.correspondenceAddress?.street || ''}
                          onChange={(e) => handleCorrespondenceAddressChange('street', e.target.value)}
                          className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                        />
                        {validationErrors.corrStreet && (
                          <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.corrStreet}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252824] mb-1">
                          City / Town <span className="text-[#9E2A2B]">*</span>
                        </label>
                        <input
                          type="text"
                          value={personal.correspondenceAddress?.city || ''}
                          onChange={(e) => handleCorrespondenceAddressChange('city', e.target.value)}
                          className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                        />
                        {validationErrors.corrCity && (
                          <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.corrCity}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252824] mb-1">
                          District <span className="text-[#9E2A2B]">*</span>
                        </label>
                        <input
                          type="text"
                          value={personal.correspondenceAddress?.district || ''}
                          onChange={(e) => handleCorrespondenceAddressChange('district', e.target.value)}
                          className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                        />
                        {validationErrors.corrDistrict && (
                          <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.corrDistrict}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252824] mb-1">
                          State / Union Territory <span className="text-[#9E2A2B]">*</span>
                        </label>
                        <input
                          type="text"
                          value={personal.correspondenceAddress?.state || ''}
                          onChange={(e) => handleCorrespondenceAddressChange('state', e.target.value)}
                          className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                        />
                        {validationErrors.corrState && (
                          <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.corrState}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252824] mb-1">
                          PIN Code (6 Digits) <span className="text-[#9E2A2B]">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={personal.correspondenceAddress?.pincode || ''}
                          onChange={(e) => handleCorrespondenceAddressChange('pincode', e.target.value)}
                          className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                        />
                        {validationErrors.corrPincode && (
                          <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.corrPincode}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#252824] mb-1">
                          Country <span className="text-[#9E2A2B]">*</span>
                        </label>
                        <input
                          type="text"
                          value={personal.correspondenceAddress?.country || 'India'}
                          onChange={(e) => handleCorrespondenceAddressChange('country', e.target.value)}
                          className="w-full text-xs p-2 border border-[#DDDCD5] rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#ECEBE4]">
              <button
                type="button"
                onClick={() => {
                  if (!validateStage1()) {
                    setError('Please resolve the highlighted validation errors before proceeding.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="px-5 py-2.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
              >
                Proceed to Academic Details
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: Academic Details — Exactly matching the user's provided UI      */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="bg-white p-6 sm:p-8 rounded border border-[#DDDCD5] space-y-6">
            {/* Header: Title + DigiLocker Demo Connected Badge */}
            <div className="flex items-center justify-between border-b border-[#ECEBE4] pb-4">
              <h2 className="font-serif font-bold text-xl text-[#254D3C]">
                Academic Details
              </h2>

              {digiLockerConnected ? (
                <div className="inline-flex items-center px-3 py-1 bg-[#254D3C] text-white text-xs font-semibold rounded-md shadow-sm">
                  <Check className="w-3.5 h-3.5 mr-1" strokeWidth={3} />
                  DigiLocker Demo Connected
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDigiLockerOpen(true)}
                  className="px-3.5 py-1.5 bg-[#254D3C] text-white text-xs font-semibold rounded-md hover:bg-[#1c3b2e] flex items-center shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Auto-Fill via DigiLocker Demo
                </button>
              )}
            </div>

            {/* Notification Banner when Academic Information is Imported */}
            {importNotice && (
              <div className="p-3.5 bg-[#edf5f0] border border-[#d2e4d8] rounded-md flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full border border-[#2B6E4E] flex items-center justify-center text-[#2B6E4E] mt-0.5 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#254D3C]">
                    {importNotice.title}
                  </h4>
                  <p className="text-[11px] text-[#4b5563] mt-0.5">
                    {importNotice.subtitle}
                  </p>
                </div>
              </div>
            )}

            {/* Class 10th Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#252824]">
                Class 10th Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Board Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE"
                    value={academic.class10?.board || ''}
                    onChange={(e) =>
                      setAcademic({
                        ...academic,
                        class10: { ...academic.class10, board: e.target.value },
                        fieldMeta: { ...academic.fieldMeta, 'class10.board': 'manual' },
                      })
                    }
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class10.board'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c10Board && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c10Board}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE2022091"
                    value={academic.class10?.rollNumber || ''}
                    onChange={(e) =>
                      setAcademic({
                        ...academic,
                        class10: { ...academic.class10, rollNumber: e.target.value },
                        fieldMeta: { ...academic.fieldMeta, 'class10.rollNumber': 'manual' },
                      })
                    }
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class10.rollNumber'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c10Roll && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c10Roll}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Passing Year *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2022"
                    value={academic.class10?.passingYear || ''}
                    onChange={(e) =>
                      setAcademic({
                        ...academic,
                        class10: { ...academic.class10, passingYear: e.target.value ? Number(e.target.value) : '' },
                        fieldMeta: { ...academic.fieldMeta, 'class10.passingYear': 'manual' },
                      })
                    }
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class10.passingYear'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c10Year && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c10Year}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Aggregate Percentage *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 93%"
                    value={academic.class10?.percentage !== '' && academic.class10?.percentage !== undefined ? `${academic.class10.percentage}%` : ''}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace('%', '').trim();
                      setAcademic({
                        ...academic,
                        class10: { ...academic.class10, percentage: cleanVal },
                        fieldMeta: { ...academic.fieldMeta, 'class10.percentage': 'manual' },
                      });
                    }}
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class10.percentage'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c10Pct && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c10Pct}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    School Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your school name"
                    value={academic.class10?.schoolName || ''}
                    onChange={(e) =>
                      setAcademic({
                        ...academic,
                        class10: { ...academic.class10, schoolName: e.target.value },
                        fieldMeta: { ...academic.fieldMeta, 'class10.schoolName': 'manual' },
                      })
                    }
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.class10?.schoolName && academic.fieldMeta?.['class10.schoolName'] === 'imported' ? (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  ) : academic.fieldMeta?.['class10.board'] === 'imported' ? (
                    <span className="text-[11px] text-[#B45309] font-medium mt-1 block">
                      Not available in imported documents — enter manually.
                    </span>
                  ) : null}
                  {validationErrors.c10School && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c10School}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Subtle Divider Line matching screenshot */}
            <hr className="border-[#ECEBE4] my-6" />

            {/* Class 12th Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#252824]">
                Class 12th Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Board Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE"
                    value={academic.class12?.board || ''}
                    onChange={(e) =>
                      setAcademic({
                        ...academic,
                        class12: { ...academic.class12, board: e.target.value },
                        fieldMeta: { ...academic.fieldMeta, 'class12.board': 'manual' },
                      })
                    }
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class12.board'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c12Board && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c12Board}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE2024101"
                    value={academic.class12?.rollNumber || ''}
                    onChange={(e) =>
                      setAcademic({
                        ...academic,
                        class12: { ...academic.class12, rollNumber: e.target.value },
                        fieldMeta: { ...academic.fieldMeta, 'class12.rollNumber': 'manual' },
                      })
                    }
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class12.rollNumber'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c12Roll && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c12Roll}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Passing Year *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2024"
                    value={academic.class12?.passingYear || ''}
                    onChange={(e) =>
                      setAcademic({
                        ...academic,
                        class12: { ...academic.class12, passingYear: e.target.value ? Number(e.target.value) : '' },
                        fieldMeta: { ...academic.fieldMeta, 'class12.passingYear': 'manual' },
                      })
                    }
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class12.passingYear'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c12Year && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c12Year}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Aggregate Percentage *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 92.4%"
                    value={academic.class12?.percentage !== '' && academic.class12?.percentage !== undefined ? `${academic.class12.percentage}%` : ''}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace('%', '').trim();
                      setAcademic({
                        ...academic,
                        class12: { ...academic.class12, percentage: cleanVal },
                        fieldMeta: { ...academic.fieldMeta, 'class12.percentage': 'manual' },
                      });
                    }}
                    className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                  />
                  {academic.fieldMeta?.['class12.percentage'] === 'imported' && (
                    <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                      ✓ Imported
                    </span>
                  )}
                  {validationErrors.c12Pct && (
                    <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c12Pct}</p>
                  )}
                </div>
              </div>

              {/* Subject-wise Marks Table matching screenshot */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#4b5563]">
                    Subject-wise marks
                  </span>
                  <button
                    type="button"
                    onClick={add12thSubject}
                    className="text-[11px] font-semibold text-[#254D3C] hover:underline flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-0.5" /> Add Subject
                  </button>
                </div>

                {academic.class12?.subjects?.length > 0 ? (
                  <div className="border border-[#ECEBE4] rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#ECEBE4] text-[#6B716C]">
                          <th className="py-2 px-3 font-semibold w-2/5">Subject</th>
                          <th className="py-2 px-3 font-semibold w-1/4">Marks</th>
                          <th className="py-2 px-3 font-semibold w-1/4">Source</th>
                          <th className="py-2 px-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECEBE4]">
                        {academic.class12.subjects.map((sub, idx) => (
                          <tr key={idx} className="hover:bg-[#F7F6F2]/60">
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Subject Name (e.g. Mathematics)"
                                value={sub.subjectName}
                                onChange={(e) => handle12thSubjectChange(idx, 'subjectName', e.target.value)}
                                className="w-full bg-transparent font-medium text-[#252824] focus:outline-none focus:border-b focus:border-[#254D3C]"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  placeholder="Marks"
                                  value={sub.marksObtained}
                                  onChange={(e) => handle12thSubjectChange(idx, 'marksObtained', e.target.value)}
                                  className="w-14 bg-transparent font-medium text-[#252824] focus:outline-none focus:border-b focus:border-[#254D3C]"
                                />
                                <span className="text-[#6B716C]">/{sub.maxMarks || 100}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {sub.source === 'imported' ? (
                                <span className="text-[11px] text-[#2B6E4E] font-medium">
                                  Imported
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#6B716C] font-medium">
                                  Manual
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => remove12thSubject(idx)}
                                className="text-gray-400 hover:text-[#9E2A2B] p-1"
                                title="Remove Subject"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F7F6F2] border border-[#DDDCD5] rounded text-center text-xs text-[#6B716C]">
                    No subject marks added yet. Click <strong>+ Add Subject</strong> to add marks manually or import via DigiLocker Demo.
                  </div>
                )}
              </div>

              {/* Class 12 School Name */}
              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter your school name"
                  value={academic.class12?.schoolName || ''}
                  onChange={(e) =>
                    setAcademic({
                      ...academic,
                      class12: { ...academic.class12, schoolName: e.target.value },
                      fieldMeta: { ...academic.fieldMeta, 'class12.schoolName': 'manual' },
                    })
                  }
                  className="w-full text-xs p-2.5 border border-[#DDDCD5] rounded bg-[#F7F6F2] focus:outline-none focus:border-[#254D3C]"
                />
                {academic.class12?.schoolName && academic.fieldMeta?.['class12.schoolName'] === 'imported' ? (
                  <span className="text-[11px] text-[#2B6E4E] font-medium flex items-center mt-1">
                    ✓ Imported
                  </span>
                ) : academic.fieldMeta?.['class12.board'] === 'imported' ? (
                  <span className="text-[11px] text-[#B45309] font-medium mt-1 block">
                    Manual entry required
                  </span>
                ) : null}
                {validationErrors.c12School && (
                  <p className="text-[11px] text-[#9E2A2B] mt-1">{validationErrors.c12School}</p>
                )}
              </div>
            </div>

            {/* Footer Verification Notice matching screenshot */}
            <p className="text-[11px] text-[#6B716C] mt-6 italic">
              Imported marks are checked against the issuer record when you submit.
            </p>

            {/* Step 2 Actions */}
            <div className="flex justify-between pt-4 border-t border-[#ECEBE4]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-[#DDDCD5] text-xs font-semibold rounded hover:bg-[#F7F6F2]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => handleCheckEligibility(true)}
                disabled={loading}
                className="px-5 py-2.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
              >
                Proceed to Documents
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: Required Documents Checklist                                     */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#ECEBE4] pb-3">
              <div>
                <h2 className="font-serif font-bold text-lg text-[#254D3C]">
                  Stage 3: Required Documents Checklist
                </h2>
                <p className="text-xs text-[#6B716C]">
                  Import both marksheets through DigiLocker to verify subject marks. Manual uploads are checked for readable fields and mismatches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDigiLockerOpen(true)}
                className="px-3.5 py-1.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                Import from DigiLocker Demo
              </button>
            </div>

            {/* Checklist Progress Overview */}
            <div className="bg-[#F7F6F2] p-4 rounded border border-[#DDDCD5] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-[#252824] block">Checklist Completion Status:</span>
                <span className="text-[#6B716C]">
                  {submittedMandatoryCount} of {mandatoryCount} required documents provided
                </span>
              </div>
              <div>
                {missingMandatoryCount === 0 ? (
                  <span className="inline-flex items-center text-[#2B6E4E] font-bold bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> All Mandatory Documents Submitted
                  </span>
                ) : (
                  <span className="inline-flex items-center text-amber-900 font-bold bg-amber-50 px-3 py-1 rounded border border-amber-200">
                    <AlertCircle className="w-4 h-4 mr-1.5 text-amber-700" />
                    {missingMandatoryCount} Mandatory Document(s) Missing
                  </span>
                )}
              </div>
            </div>

            {/* Checklist Table */}
            <div className="space-y-3">
              {fullChecklist.map((item) => {
                const attached = checklistDocuments.find((ad) => ad.docType === item.docType);
                const isUploading = uploadingDocType === item.docType;

                return (
                  <div
                    key={item.docType}
                    className={`p-3.5 rounded border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                      attached
                        ? 'bg-white border-[#DDDCD5]'
                        : item.isMandatory
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-white border-[#DDDCD5]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#252824] text-sm">{item.docName}</span>
                        {item.isMandatory ? (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            Optional
                          </span>
                        )}
                      </div>

                      {attached ? (
                        <div className="text-[11px] text-[#6B716C] mt-1 space-x-2 flex items-center">
                          <span>Source: <strong>{attached.source}</strong></span>
                          <span>•</span>
                          <span>Status: <StatusBadge status={attached.verificationStatus} /></span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#6B716C] mt-1">
                          Not submitted yet
                        </div>
                      )}

                      {attached?.extractedData?.mismatchDetails?.length > 0 && (
                        <ul className="mt-1 text-[11px] text-rose-800 list-disc list-inside">
                          {attached.extractedData.mismatchDetails.map((mismatch) => <li key={mismatch}>{mismatch}</li>)}
                        </ul>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {attached ? (
                        <>
                          <a
                            href={attached.filePath}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-[#F7F6F2] hover:bg-[#ECEBE4] text-[#254D3C] font-semibold rounded border border-[#DDDCD5] flex items-center"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> View
                          </a>
                          <label className="px-2.5 py-1.5 bg-[#F7F6F2] hover:bg-[#ECEBE4] text-[#254D3C] font-semibold rounded border border-[#DDDCD5] cursor-pointer">
                            Replace
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => handleIndividualUpload(item.docType, item.docName, e.target.files[0])}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(attached._id)}
                            className="text-[#9E2A2B] hover:text-red-800 p-1.5"
                            title="Remove document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <label className="px-3.5 py-1.5 bg-[#254D3C] text-white font-semibold rounded hover:bg-[#1c3b2e] cursor-pointer flex items-center shadow-sm">
                          {isUploading ? 'Uploading...' : 'Upload File'}
                          <Upload className="w-3.5 h-3.5 ml-1.5" />
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={(e) => handleIndividualUpload(item.docType, item.docName, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#ECEBE4]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-[#DDDCD5] text-xs font-semibold rounded hover:bg-[#F7F6F2]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => handleCheckEligibility()}
                disabled={loading || Boolean(uploadingDocType)}
                className="px-5 py-2.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] flex items-center shadow-sm"
              >
                {loading ? 'Evaluating Requirements...' : 'Check Eligibility & Continue'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: Eligibility Results & Final Review / Submission                  */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="bg-white p-6 rounded border border-[#DDDCD5] space-y-6">
            <h2 className="font-serif font-bold text-lg text-[#254D3C] border-b border-[#ECEBE4] pb-3">
              Stage 4: Review Application & Submit
            </h2>

            {/* Evaluation Results Card */}
            {evaluation && (
              <div
                className={`p-4 rounded border text-xs space-y-3 ${
                  evaluation.status === 'Incomplete'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : evaluation.isEligible
                    ? 'bg-emerald-50 border-emerald-200 text-[#2B6E4E]'
                    : 'bg-rose-50 border-rose-200 text-[#9E2A2B]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {evaluation.status === 'Incomplete' ? (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-700" />
                  ) : evaluation.isEligible ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      Academic Eligibility:{' '}
                      {evaluation.status === 'Incomplete'
                        ? 'Information Incomplete'
                        : evaluation.isEligible
                        ? 'Eligible'
                        : 'Not Eligible'}
                    </h3>
                    <p className="text-[11px] opacity-90">{evaluation.remarks}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-current/20 space-y-1.5">
                  <div className="font-semibold">Calculated Merit Score: {evaluation.scoreCalculated} / 100</div>

                  {evaluation.rulesPassed?.length > 0 && (
                    <div className="text-[11px]">
                      <strong>Satisfied Criteria:</strong>
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                        {evaluation.rulesPassed.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.rulesFailed?.length > 0 && (
                    <div className="text-[11px] text-rose-900">
                      <strong>Missing / Failed Conditions:</strong>
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                        {evaluation.rulesFailed.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {missingMandatoryCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded text-xs">
                ⚠️ You have {missingMandatoryCount} missing mandatory document(s). You can save this application as a draft, but final submission requires all mandatory documents.
              </div>
            )}

            {evaluation?.blockers?.length > 0 && (
              <div className="p-3 rounded border border-rose-200 bg-rose-50 text-xs text-rose-900" role="alert">
                <h3 className="font-bold">Resolve these issues before submitting</h3>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  {evaluation.blockers.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              </div>
            )}
            {evaluation?.canSubmit && (
              <p className="p-3 rounded border border-emerald-200 bg-emerald-50 text-xs text-emerald-900">
                Your marks and documents meet the requirements. Submitting will approve your admission and issue your letter.
              </p>
            )}

            {/* Snapshot Summary */}
            <div className="bg-[#F7F6F2] p-4 rounded border border-[#DDDCD5] space-y-3 text-xs">
              <h4 className="font-bold text-[#252824]">Application Overview Snapshot</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#6B716C] block text-[11px]">Applicant Name:</span>
                  <strong className="text-[#252824]">{personal.fullName} ({personal.email})</strong>
                </div>
                <div>
                  <span className="text-[#6B716C] block text-[11px]">Applying Course:</span>
                  <strong className="text-[#252824]">{selectedCourse?.title} ({selectedCourse?.code})</strong>
                </div>
                <div>
                  <span className="text-[#6B716C] block text-[11px]">Category & Nationality:</span>
                  <strong className="text-[#252824]">{personal.category} • {personal.nationality}</strong>
                </div>
                <div>
                  <span className="text-[#6B716C] block text-[11px]">Parents:</span>
                  <strong className="text-[#252824]">F: {personal.fatherName} • M: {personal.motherName}</strong>
                </div>
                <div>
                  <span className="text-[#6B716C] block text-[11px]">Class 10th Aggregate:</span>
                  <strong className="text-[#252824]">{academic.class10?.percentage}% ({academic.class10?.board || 'Not specified'})</strong>
                </div>
                <div>
                  <span className="text-[#6B716C] block text-[11px]">Class 12th Aggregate:</span>
                  <strong className="text-[#252824]">{academic.class12?.percentage}% ({academic.class12?.board || 'Not specified'})</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#ECEBE4]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-[#DDDCD5] text-xs font-semibold rounded hover:bg-[#F7F6F2]"
              >
                ← Back
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmitApplication(true)}
                  disabled={loading}
                  className="px-4 py-2 border border-[#DDDCD5] bg-white text-xs font-semibold rounded hover:bg-[#F7F6F2]"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitApplication(false)}
                  disabled={loading || !evaluation?.canSubmit}
                  className="px-5 py-2.5 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DigiLocker Demonstration Modal                                            */}
        {/* ========================================================================= */}
        <DigiLockerModal
          isOpen={isDigiLockerOpen}
          onClose={() => setIsDigiLockerOpen(false)}
          onImportSuccess={handleDigiLockerImportSuccess}
          {...documentParams}
        />

        {/* ========================================================================= */}
        {/* Non-Destructive Personal Conflict Resolution Modal                         */}
        {/* ========================================================================= */}
        {conflictModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-[#DDDCD5] p-6 space-y-4">
              <div className="flex items-start space-x-3 border-b border-[#ECEBE4] pb-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#252824]">
                    Discrepancy Detected Between Application and DigiLocker Record
                  </h3>
                  <p className="text-xs text-[#6B716C] mt-0.5">
                    The imported documents contain personal demographic details that differ from what you previously entered. Choose which value to retain for your official admission record.
                  </p>
                </div>
              </div>

              <div className="border border-[#ECEBE4] rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F6F2] text-[#6B716C] border-b border-[#ECEBE4]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Field</th>
                      <th className="py-2.5 px-3 font-semibold">Current Form Entry</th>
                      <th className="py-2.5 px-3 font-semibold">DigiLocker Record</th>
                      <th className="py-2.5 px-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEBE4]">
                    {detectedConflicts.map((c) => (
                      <tr key={c.field} className="hover:bg-[#F7F6F2]/40">
                        <td className="py-2.5 px-3 font-medium text-[#252824]">{c.label}</td>
                        <td className="py-2.5 px-3 text-[#6B716C]">{c.currentValue || '(empty)'}</td>
                        <td className="py-2.5 px-3 text-[#254D3C] font-semibold">{c.importedValue}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={conflictDecisions[c.field] || 'imported'}
                            onChange={(e) =>
                              setConflictDecisions({
                                ...conflictDecisions,
                                [c.field]: e.target.value,
                              })
                            }
                            className="text-xs p-1 border border-[#DDDCD5] rounded bg-white"
                          >
                            <option value="imported">Use DigiLocker Value</option>
                            <option value="keep">Keep My Entry</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-[#F7F6F2] rounded text-[11px] text-[#6B716C] flex items-center space-x-2">
                <Info className="w-4 h-4 text-[#254D3C] flex-shrink-0" />
                <span>
                  The application must match the verified DigiLocker details before you can submit.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECEBE4]">
                <button
                  type="button"
                  onClick={handleResolveConflicts}
                  className="px-5 py-2 bg-[#254D3C] text-white text-xs font-semibold rounded hover:bg-[#1c3b2e]"
                >
                  Apply Choices & Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
