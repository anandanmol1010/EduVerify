import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  ShieldCheck,
  Lock,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  X,
  Shield,
  Key,
  ShieldAlert,
  Loader2,
  Check,
  Smartphone,
  ChevronRight,
  User,
  Info,
  Calendar,
  Building2,
  RefreshCw,
} from 'lucide-react';

export default function DigiLockerModal({ isOpen, onClose, onImportSuccess, applicationId }) {
  // Navigation Screens:
  // 1 = Screen 1: Mobile Number Login (with +91 and demo suggestions)
  // 2 = Screen 2: Select Account (avatar, masked name, verified tag)
  // 3 = Screen 3: Verify 6-digit OTP (separate auto-advancing boxes)
  // 4 = Screen 4: Document Selection and Explicit Consent (checkboxes, details, Allow / Deny)
  // 5 = Screen 5: Processing & Verification
  const [screen, setScreen] = useState(1);

  // Session State
  const [sessionId, setSessionId] = useState('');
  const [clientApp, setClientApp] = useState('EduVerify — Admission Process Automation System');
  const [purpose, setPurpose] = useState('Verification of academic certificates and identity documents for college admission');
  const [demoMobiles, setDemoMobiles] = useState([]);

  // Screen 1: Mobile State
  const [mobileInput, setMobileInput] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');

  // Screen 2: Accounts State
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [authenticatedAccount, setAuthenticatedAccount] = useState(null);

  // Screen 3: OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(116); // 01:56 format
  const [isResending, setIsResending] = useState(false);
  const otpInputRefs = useRef([]);

  // Screen 4: Consent & Documents State
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [selectedDocTypes, setSelectedDocTypes] = useState([]);
  const [authCode, setAuthCode] = useState('');

  // Screen 5: Processing State
  const [processingStatus, setProcessingStatus] = useState('Retrieving selected documents...');
  const [processingProgress, setProcessingProgress] = useState(25);

  // Global UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize session whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setScreen(1);
      setError('');
      setMobileInput('');
      setMaskedMobile('');
      setAccounts([]);
      setSelectedAccountId('');
      setAuthenticatedAccount(null);
      setOtpDigits(['', '', '', '', '', '']);
      setResendCountdown(116);
      setAvailableDocuments([]);
      setSelectedDocTypes([]);
      setAuthCode('');
      setProcessingProgress(25);
      initSession();
    }
  }, [isOpen]);

  // Countdown timer for Screen 3 OTP Resend
  useEffect(() => {
    let timer;
    if (screen === 3 && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [screen, resendCountdown]);

  const initSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/digilocker/oauth/init', { applicationId });
      if (res.success) {
        setSessionId(res.sessionId);
        setClientApp(res.clientApp || 'EduVerify — Admission Process Automation System');
        setPurpose(res.purpose || 'Verification of academic certificates and identity documents for college admission');
        setDemoMobiles(res.demoMobiles || [
          { mobile: '0000000001', note: 'Aarav Sharma (CBSE 2024, 92.4% - All Documents)' },
          { mobile: '0000000002', note: 'Priya Venkatesh (CBSE 2024, 96.2% - High Merit)' },
          { mobile: '0000000003', note: 'Rohan Banerjee (ISC 2024, 88.0% - All Documents)' },
          { mobile: '0000000004', note: 'Ananya Deshmukh (MSB 2023, 76.5% - State Board)' },
          { mobile: '0000000005', note: 'Vikramaditya Rao (CBSE 2024, 84.6% - Academic Only)' },
          { mobile: '0000000006', note: 'Meera Kulkarni (KRN 2024, 91.2% - State Board)' },
        ]);
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize demonstration authorization session.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Screen 1: Submit Mobile Identifier
  // -------------------------------------------------------------
  const handleMobileSubmit = async (e) => {
    if (e) e.preventDefault();
    const clean = mobileInput.trim().replace(/^(\+91|91)/, '').replace(/[\s-]/g, '');

    if (!clean) {
      return setError('Please enter a demonstration mobile identifier.');
    }

    if (clean.length < 10) {
      return setError('Please enter a valid 10-digit demonstration identifier.');
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/digilocker/oauth/mobile-login', {
        sessionId,
        demoMobile: clean,
      });

      if (res.success) {
        setMaskedMobile(res.maskedMobile);
        setAccounts(res.accounts || []);
        if (res.accounts && res.accounts.length === 1) {
          // If only 1 account associated, select it by default
          setSelectedAccountId(res.accounts[0].demoAccountId);
        }
        setScreen(2);
      }
    } catch (err) {
      setError(err.message || 'Mobile number not recognized in demo repository.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Screen 2: Select Account
  // -------------------------------------------------------------
  const handleAccountSelect = async (account) => {
    setSelectedAccountId(account.demoAccountId);
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/digilocker/oauth/select-account', {
        sessionId,
        demoAccountId: account.demoAccountId,
      });

      if (res.success) {
        setScreen(3);
        setOtpDigits(['', '', '', '', '', '']);
        setResendCountdown(116);
        setTimeout(() => {
          if (otpInputRefs.current[0]) {
            otpInputRefs.current[0].focus();
          }
        }, 150);
      }
    } catch (err) {
      setError(err.message || 'Failed to select demo account.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Screen 3: OTP Input Handlers (6 Individual Boxes)
  // -------------------------------------------------------------
  const handleOtpChange = (index, value) => {
    // Only accept numbers
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      // User pasted multiple digits
      const pasted = cleanVal.slice(0, 6).split('');
      pasted.forEach((char, i) => {
        if (index + i < 6) newDigits[index + i] = char;
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(index + pasted.length, 5);
      if (otpInputRefs.current[nextFocus]) otpInputRefs.current[nextFocus].focus();
      return;
    }

    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance
    if (cleanVal && index < 5) {
      if (otpInputRefs.current[index + 1]) {
        otpInputRefs.current[index + 1].focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      // Move to previous box on backspace
      if (otpInputRefs.current[index - 1]) {
        otpInputRefs.current[index - 1].focus();
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6) {
      return setError('Please enter the complete 6-digit demonstration OTP.');
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/digilocker/oauth/verify-otp', {
        sessionId,
        otp: fullOtp,
      });

      if (res.success) {
        setAuthenticatedAccount(res.account);
        // Load documents for Screen 4
        await loadAvailableDocuments();
        setScreen(4);
      }
    } catch (err) {
      setError(err.message || 'Incorrect OTP entered.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (resendCountdown > 0) return;
    setIsResending(true);
    setTimeout(() => {
      setResendCountdown(116);
      setIsResending(false);
      setError('');
    }, 600);
  };

  const fillDemoOtp = () => {
    setOtpDigits(['1', '2', '3', '4', '5', '6']);
    if (otpInputRefs.current[5]) otpInputRefs.current[5].focus();
  };

  // -------------------------------------------------------------
  // Screen 4: Load Documents & Handle Consent
  // -------------------------------------------------------------
  const loadAvailableDocuments = async () => {
    try {
      const res = await api.get(`/digilocker/oauth/documents?sessionId=${sessionId}`);
      if (res.success) {
        setAvailableDocuments(res.documents || []);
        // All checkboxes start unchecked as per prompt requirements
        setSelectedDocTypes([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve available account documents.');
    }
  };

  const toggleDocSelection = (docType) => {
    if (selectedDocTypes.includes(docType)) {
      setSelectedDocTypes(selectedDocTypes.filter((t) => t !== docType));
    } else {
      setSelectedDocTypes([...selectedDocTypes, docType]);
    }
  };

  const handleSelectAllDocs = () => {
    if (selectedDocTypes.length === availableDocuments.length) {
      setSelectedDocTypes([]);
    } else {
      setSelectedDocTypes(availableDocuments.map((d) => d.docType));
    }
  };

  const handleConsentDecision = async (decision) => {
    if (decision === 'deny') {
      try {
        await api.post('/digilocker/oauth/consent', { sessionId, decision: 'deny' });
      } catch (e) {
        // Continue cancellation
      }
      onClose();
      return;
    }

    if (selectedDocTypes.length === 0) {
      return setError('Please select at least one document to share with EduVerify.');
    }

    setLoading(true);
    setError('');

    try {
      // 1. Grant consent
      const consentRes = await api.post('/digilocker/oauth/consent', {
        sessionId,
        decision: 'allow',
        selectedDocTypes,
      });

      if (!consentRes.success) {
        throw new Error(consentRes.message || 'Failed to record consent.');
      }

      setAuthCode(consentRes.authCode);
      setScreen(5); // Go to Processing Screen

      // 2. Perform step-by-step import animation and actual exchange
      setProcessingStatus('Retrieving selected documents from demo repository...');
      setProcessingProgress(40);

      setTimeout(async () => {
        setProcessingStatus('Importing academic & identity records...');
        setProcessingProgress(70);

        try {
          const exchangeRes = await api.post('/digilocker/oauth/exchange', {
            sessionId,
            authCode: consentRes.authCode,
            selectedDocTypes,
            applicationId,
          });

          if (exchangeRes.success) {
            setProcessingStatus('Preparing admission form information...');
            setProcessingProgress(90);

            setTimeout(() => {
              setProcessingStatus('Documents imported successfully!');
              setProcessingProgress(100);

              setTimeout(() => {
                onImportSuccess(exchangeRes);
                onClose();
              }, 700);
            }, 600);
          } else {
            throw new Error(exchangeRes.message || 'Exchange failed.');
          }
        } catch (err) {
          setError(err.message || 'Failed to exchange documents.');
          setScreen(4); // Return to consent screen
          setLoading(false);
        }
      }, 700);
    } catch (err) {
      setError(err.message || 'Consent error.');
      setLoading(false);
    }
  };

  // Format countdown mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      {/* Outer Lavender Simulation Canvas */}
      <div className="relative w-full max-w-xl my-8 bg-[#EEECFB] rounded-2xl shadow-2xl border border-[#D5CEF9] overflow-hidden flex flex-col">
        
        {/* Top Watermark / Academic Simulation Bar */}
        <div className="bg-[#5B3EE6] text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold tracking-wide">
              DigiLocker Demo — EduVerify Academic Simulation
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded transition-colors"
            title="Close Demonstration Gateway"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="m-4 mb-0 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold ml-1">
              ×
            </button>
          </div>
        )}

        {/* Inner Content Area */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">

          {/* ========================================================================= */}
          {/* SCREEN 1: Mobile Number Login (Matched to Reference Screenshot 1)        */}
          {/* ========================================================================= */}
          {screen === 1 && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2DEFA] space-y-6">
              {/* DigiLocker Brand Header (Simulated / Educational) */}
              <div className="flex items-center space-x-3 pb-2 border-b border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-[#5B3EE6] flex items-center justify-center text-white shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#1C1844] flex items-center space-x-1.5">
                    <span>DigiLocker</span>
                    <span className="text-[10px] font-medium bg-[#EEECFB] text-[#5B3EE6] px-1.5 py-0.5 rounded">
                      Demo
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Document Wallet for Fictional Students</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">Login or Create Account</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your mobile number to proceed
                </p>
              </div>

              <form onSubmit={handleMobileSubmit} className="space-y-4">
                {/* Mobile Input with +91 Prefix */}
                <div>
                  <div className="flex items-center border border-[#B6A8F8] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#5B3EE6] focus-within:border-transparent transition-all bg-white">
                    <span className="px-4 py-3 bg-gray-50 text-gray-600 font-medium text-sm border-r border-gray-200">
                      +91
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Mobile number"
                      value={mobileInput}
                      onChange={(e) => setMobileInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Continue Purple Primary Button */}
                <button
                  type="submit"
                  disabled={loading || mobileInput.length < 10}
                  className="w-full py-3 bg-[#8C76F8] hover:bg-[#785FF6] disabled:bg-[#C9C0FC] text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking demo identifier...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>

                <p className="text-[11px] text-center text-gray-400">
                  By continuing, I agree to the <span className="text-[#5B3EE6] hover:underline cursor-pointer">Terms of Service</span>
                </p>
              </form>

              {/* Assistance Section with Predefined Demo Identifiers */}
              <div className="pt-4 border-t border-gray-100">
                <div className="p-3.5 bg-[#F6F4FE] rounded-xl border border-[#E3DCFD] text-xs space-y-2">
                  <div className="flex items-center text-[#5B3EE6] font-semibold text-[11px] space-x-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Fictional Demonstration Numbers (Click to Fill):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {demoMobiles.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMobileInput(item.mobile);
                          setError('');
                        }}
                        className="text-left p-2 rounded-lg bg-white border border-[#DDD5FA] hover:border-[#5B3EE6] hover:bg-[#EEECFB] transition-all group"
                      >
                        <div className="font-mono font-bold text-gray-800 group-hover:text-[#5B3EE6] text-xs">
                          +91 {item.mobile}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{item.note}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 2: Select Account (Matched to Reference Screenshot 2)              */}
          {/* ========================================================================= */}
          {screen === 2 && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2DEFA] space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setScreen(1);
                    setError('');
                  }}
                  className="flex items-center text-xs text-gray-500 hover:text-[#5B3EE6] font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Change mobile ({maskedMobile})
                </button>
                <span className="text-[11px] bg-[#EEECFB] text-[#5B3EE6] px-2 py-0.5 rounded-full font-medium">
                  {accounts.length} Demo Account{accounts.length > 1 ? 's' : ''} Found
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">Select Account</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the demonstration account associated with this mobile identifier
                </p>
              </div>

              {/* Accounts List Cards */}
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.demoAccountId}
                    onClick={() => handleAccountSelect(acc)}
                    className="p-4 border border-[#E2DEFA] hover:border-[#5B3EE6] rounded-2xl cursor-pointer transition-all hover:shadow-md bg-white flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3.5">
                      {/* Initials Avatar Matching Reference */}
                      <div className="w-12 h-12 rounded-xl bg-[#5B3EE6] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                        {acc.initials}
                      </div>
                      <div>
                        {/* Masked Name Matching Reference Screenshot */}
                        <div className="font-bold text-gray-900 group-hover:text-[#5B3EE6] text-sm tracking-wide">
                          {acc.maskedName}
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-xs font-semibold text-emerald-600 flex items-center">
                            Verified
                            <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-emerald-600 fill-emerald-100" />
                          </span>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-[11px] text-gray-500">{acc.board} ({acc.passingYear})</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {acc.hasAadhaar ? 'Identity & Academic Records Present' : 'Academic Records Only'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#5B3EE6] group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>

              {/* Non-Functional Secondary Reference Action with Academic Disclaimer */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-[#5B3EE6]/10 text-[#5B3EE6] font-semibold text-sm rounded-xl cursor-not-allowed opacity-60 flex items-center justify-center space-x-1"
                >
                  <span>+ Create New Account</span>
                  <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-gray-500 ml-2">Demo Only</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 3: Verify 6-digit OTP (Matched to Reference Screenshot 3)          */}
          {/* ========================================================================= */}
          {screen === 3 && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2DEFA] space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setScreen(2);
                    setError('');
                  }}
                  className="flex items-center text-xs text-gray-500 hover:text-[#5B3EE6] font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to accounts
                </button>
                <div className="w-7 h-7 rounded-lg bg-[#EEECFB] text-[#5B3EE6] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">Verify OTP</h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Please enter One Time Password (OTP) sent to your demo mobile identifier ({maskedMobile})
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6 Individual Auto-Advancing Digit Boxes */}
                <div className="flex justify-between items-center gap-2 max-w-sm mx-auto">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all ${
                        digit
                          ? 'border-[#5B3EE6] bg-[#F7F5FE] text-[#5B3EE6]'
                          : 'border-gray-300 bg-white text-gray-800'
                      } focus:border-[#5B3EE6] focus:ring-2 focus:ring-[#5B3EE6]/20 focus:outline-none`}
                    />
                  ))}
                </div>

                {/* Resend OTP Timer Controls */}
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <div>
                    {resendCountdown > 0 ? (
                      <span>Resend OTP in <strong className="text-gray-700 font-mono">{formatTime(resendCountdown)}</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending}
                        className="text-[#5B3EE6] font-semibold hover:underline flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isResending ? 'animate-spin' : ''}`} />
                        <span>Resend Demo OTP</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoOtp}
                    className="text-[#5B3EE6] font-semibold hover:underline"
                  >
                    Quick-fill (123456)
                  </button>
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-full py-3 bg-[#8C76F8] hover:bg-[#785FF6] disabled:bg-[#C9C0FC] text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <span>Verify</span>
                  )}
                </button>
              </form>

              {/* Demo Notice Banner */}
              <div className="p-3 bg-[#EEECFB] rounded-xl border border-[#DDD5FA] text-center text-[11px] text-[#5B3EE6]">
                Academic Simulation Mode: Use demonstration OTP <strong>123456</strong>. No real SMS messages are dispatched.
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 4: Document Selection and Explicit Consent                         */}
          {/* ========================================================================= */}
          {screen === 4 && (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2DEFA] space-y-6">
              {/* Permission Request Header */}
              <div className="flex items-start space-x-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#5B3EE6] flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Consent & Document Authorization
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    <strong>{clientApp}</strong> is requesting permission to access your selected academic and identity documents for admission processing.
                  </p>
                </div>
              </div>

              {/* Purpose and Account Banner */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Authenticated Account:</span>
                  <span className="font-bold text-gray-800">{authenticatedAccount?.fullName} ({authenticatedAccount?.rollNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Board / Year:</span>
                  <span className="text-gray-700">{authenticatedAccount?.board} • {authenticatedAccount?.passingYear}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Access Purpose:</span>
                  <span className="text-gray-700 font-medium">{purpose}</span>
                </div>
              </div>

              {/* Document Selection Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900">
                    Select Documents to Share ({selectedDocTypes.length} of {availableDocuments.length} selected):
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllDocs}
                    className="text-[#5B3EE6] font-semibold hover:underline"
                  >
                    {selectedDocTypes.length === availableDocuments.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {availableDocuments.map((doc) => {
                    const isSelected = selectedDocTypes.includes(doc.docType);
                    const isAadhaar = doc.docType === 'aadhaar_card';

                    return (
                      <div
                        key={doc.docType}
                        onClick={() => toggleDocSelection(doc.docType)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-3 ${
                          isSelected
                            ? 'border-[#5B3EE6] bg-[#F7F5FE]'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#5B3EE6] focus:ring-[#5B3EE6]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900 flex items-center space-x-1.5">
                              <span>{doc.title}</span>
                              {isAadhaar && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                  Mandatory Identity Document
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400">{doc.category}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 flex items-center space-x-2">
                            <span>Issuer: {doc.issuerAuthority}</span>
                            <span>•</span>
                            <span>Issued: {doc.issueDate}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Deny vs Allow */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleConsentDecision('deny')}
                  disabled={loading}
                  className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all"
                >
                  Deny / Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConsentDecision('allow')}
                  disabled={loading || selectedDocTypes.length === 0}
                  className="w-1/2 py-3 bg-[#5B3EE6] hover:bg-[#4d32cf] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Allow & Share Selected ({selectedDocTypes.length})</span>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-center text-gray-400">
                Only explicitly selected and authorized documents will be imported into EduVerify. Unselected documents will NOT be retrieved.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 5: Processing and Verification Animation                           */}
          {/* ========================================================================= */}
          {screen === 5 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E2DEFA] text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[#EEECFB] text-[#5B3EE6] flex items-center justify-center mx-auto shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">Processing Document Import</h3>
                <p className="text-xs text-gray-500 mt-1 font-medium">{processingStatus}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#5B3EE6] h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>

              <div className="text-[11px] text-gray-400">
                Associating authorized documents and academic records with your admission profile...
              </div>
            </div>
          )}

        </div>

        {/* Bottom Disclaimer */}
        <div className="px-6 py-2.5 bg-[#E6E2FA] border-t border-[#D5CEF9] text-center text-[11px] text-gray-500">
          EduVerify Full-Stack Academic Project • Decoupled Simulated Document Depository
        </div>
      </div>
    </div>
  );
}
