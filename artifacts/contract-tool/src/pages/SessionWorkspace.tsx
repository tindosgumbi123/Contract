import React, { useEffect, useRef, useState } from 'react';
import logoUrl from '@assets/Logo_Registered_.jpg_1784563137893.jpeg';
import { useParams, Link } from 'wouter';
import { useGetSession, useUpdateSession, useSaveSignature, getGetSessionQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { PdfGenerator } from '@/components/PdfGenerator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, Copy, ArrowLeft, PenTool, Link as LinkIcon, Save, Clock, FileEdit, User, FileText, ChevronRight,
  Building
} from 'lucide-react';
import { format } from 'date-fns';

export default function SessionWorkspace() {
  const params = useParams();
  const token = params.token!;
  const { data: session, isLoading, error } = useGetSession(token);
  const updateSession = useUpdateSession();
  const saveSignature = useSaveSignature();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('employment');

  // Form states
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeAddress: '',
    letterDate: '',
    position: '',
    startDate: '',
    annualSalary: '',
    monthlySalary: '',
    supervisor: '',
    employmentStatus: '',
    placeOfWork: '',
    projectManagerName: '',
  });

  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSavedData = useRef(formData);
  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (session && initializedForId.current !== session.id) {
      initializedForId.current = session.id;
      const initialData = {
        employeeName: session.employeeName || '',
        employeeAddress: session.employeeAddress || '',
        letterDate: session.letterDate || '',
        position: session.position || '',
        startDate: session.startDate || '',
        annualSalary: session.annualSalary || '',
        monthlySalary: session.monthlySalary || '',
        supervisor: session.supervisor || '',
        employmentStatus: session.employmentStatus || '',
        placeOfWork: session.placeOfWork || '',
        projectManagerName: (session as any).projectManagerName || '',
      };
      setFormData(initialData);
      lastSavedData.current = initialData;
    }
  }, [session]);

  const mutateRef = useRef(updateSession.mutate);
  mutateRef.current = updateSession.mutate;

  const handleBlur = (field: string) => {
    if (!session) return;
    
    const currentValue = formData[field as keyof typeof formData];
    const lastValue = lastSavedData.current[field as keyof typeof formData];

    if (currentValue !== lastValue) {
      setSavingState('saving');
      mutateRef.current(
        {
          id: token,
          data: { [field]: currentValue }
        },
        {
          onSuccess: (updatedData) => {
            lastSavedData.current = { ...lastSavedData.current, [field]: currentValue };
            setSavingState('saved');
            queryClient.setQueryData(getGetSessionQueryKey(token), (old: any) => 
              old ? { ...old, [field]: currentValue } : old
            );
            setTimeout(() => setSavingState('idle'), 2000);
          }
        }
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setSavingState('saving');
    mutateRef.current(
      {
        id: token,
        data: { [name]: value }
      },
      {
        onSuccess: () => {
          lastSavedData.current = { ...lastSavedData.current, [name]: value };
          setSavingState('saved');
          queryClient.setQueryData(getGetSessionQueryKey(token), (old: any) => 
            old ? { ...old, [name]: value } : old
          );
          setTimeout(() => setSavingState('idle'), 2000);
        }
      }
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    toast({
      title: "Link Copied",
      description: "Share link has been copied to your clipboard.",
    });
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const onSign = (role: string) => (signatureData: string, signerName?: string, signedAt?: string) => {
    saveSignature.mutate(
      {
        id: token,
        data: {
          role: role as any,
          signatureData,
          signedAt: signedAt || new Date().toISOString(),
          signerName
        }
      },
      {
        onSuccess: (updatedSession) => {
          toast({
            title: "Signature Saved",
            description: "The contract has been securely updated.",
          });
          queryClient.setQueryData(getGetSessionQueryKey(token), updatedSession);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2 font-serif">Workspace Not Found</h2>
          <p className="text-slate-500 mb-6">The contract link you followed is invalid or has expired.</p>
          <Link href="/">
            <Button className="w-full">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const safeVal = (val: string) => val ? <span className="font-medium text-[#0ABFBC] bg-[#0ABFBC]/10 px-1 rounded">{val}</span> : <span className="text-amber-500/50 bg-amber-500/10 px-1 border-b border-amber-500/50">_________________</span>;

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm hidden md:flex">
                {session.employeeName ? session.employeeName.charAt(0) : '?'}
              </div>
              <div>
                <h1 className="font-bold text-[#2b3e50] leading-tight text-lg">
                  {session.employeeName || 'Unnamed Employee'} Workspace
                </h1>
                <p className="text-xs text-slate-500 flex items-center">
                  {session.position || 'No position set'} 
                </p>
              </div>
            </div>
            
            <div className="hidden md:flex ml-4">
              {session.status === 'signed' ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Fully Signed</Badge>
              ) : session.status === 'pending_signature' ? (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending Signatures</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600 border-slate-200"><PenTool className="w-3 h-3 mr-1" /> Draft</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center text-xs font-medium px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              {savingState === 'saving' ? (
                <span className="text-amber-600 flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"/> Saving...</span>
              ) : savingState === 'saved' ? (
                <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3"/> Saved</span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5"><Save className="w-3 h-3"/> All saved</span>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-slate-200 text-[#2b3e50] hover:bg-slate-50 hover:text-primary">
                  <FileEdit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto border-l-0 shadow-2xl">
                <SheetHeader className="mb-6">
                  <SheetTitle className="font-serif text-2xl text-[#2b3e50]">Employee Details</SheetTitle>
                  <SheetDescription>
                    Update the fields below to populate the contract documents. Changes auto-save on blur.
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 pb-20">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Personal Info</h3>
                    <div className="space-y-2">
                      <Label>Employee Full Name</Label>
                      <Input name="employeeName" value={formData.employeeName} onChange={handleChange} onBlur={() => handleBlur('employeeName')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee Address</Label>
                      <Textarea name="employeeAddress" value={formData.employeeAddress} onChange={(e: any) => handleChange(e)} onBlur={() => handleBlur('employeeAddress')} className="resize-none" />
                    </div>
                    <div className="space-y-2">
                      <Label>Letter Date</Label>
                      <Input type="date" name="letterDate" value={formData.letterDate} onChange={handleChange} onBlur={() => handleBlur('letterDate')} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Job Details</h3>
                    <div className="space-y-2">
                      <Label>Position / Job Title</Label>
                      <Input name="position" value={formData.position} onChange={handleChange} onBlur={() => handleBlur('position')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Status</Label>
                      <Select value={formData.employmentStatus} onValueChange={(val) => handleSelectChange('employmentStatus', val)}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                          <SelectItem value="Fixed Term">Fixed Term</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} onBlur={() => handleBlur('startDate')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Place of Work</Label>
                      <Input name="placeOfWork" value={formData.placeOfWork} onChange={handleChange} onBlur={() => handleBlur('placeOfWork')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Manager Name</Label>
                      <Input name="projectManagerName" value={formData.projectManagerName} onChange={handleChange} onBlur={() => handleBlur('projectManagerName')} placeholder="PM full name (appears under their signature)" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Compensation</h3>
                    <div className="space-y-2">
                      <Label>Monthly Salary</Label>
                      <Input name="monthlySalary" value={formData.monthlySalary} onChange={handleChange} onBlur={() => {
                        handleBlur('monthlySalary');
                        if (formData.monthlySalary && !formData.annualSalary) {
                          const num = parseFloat(formData.monthlySalary.replace(/[^0-9.]/g, ''));
                          if (!isNaN(num)) {
                            const annual = `R ${(num * 12).toLocaleString('en-ZA', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                            setFormData(prev => ({...prev, annualSalary: annual}));
                            mutateRef.current({ id: token, data: { annualSalary: annual } });
                          }
                        }
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Annual Salary</Label>
                      <Input name="annualSalary" value={formData.annualSalary} onChange={handleChange} onBlur={() => handleBlur('annualSalary')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Immediate Supervisor</Label>
                      <Input name="supervisor" value={formData.supervisor} onChange={handleChange} onBlur={() => handleBlur('supervisor')} />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 h-[calc(100vh-64px)]">
        
        {/* Left Column: Documents Preview (60%) */}
        <div className="flex-1 lg:w-3/5 h-full flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-slate-100 bg-slate-50/50 p-2">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="employment">Employment Contract</TabsTrigger>
                <TabsTrigger value="offer">Formal Offer</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-8 custom-scrollbar">
              
              <TabsContent value="employment" className="mt-0 h-full">
                <div className="bg-white max-w-[800px] mx-auto min-h-[1000px] shadow-md border border-slate-200 p-8 md:p-12 mb-8">
                  <div className="flex items-center gap-4 mb-8 border-b-2 border-primary pb-4">
                    <img src={logoUrl} alt="Logo" className="h-16 w-auto" />
                    <div>
                      <h2 className="text-xl font-bold text-[#2b3e50] tracking-tight">DUNWELL YOUTH PRIORITY CLINIC</h2>
                      <p className="text-sm text-slate-500">Executive Healthcare and Wellness<br/>Johannesburg, South Africa</p>
                    </div>
                  </div>

                  <div className="space-y-6 text-[15px] leading-relaxed text-slate-700">
                    <h1 className="text-center font-bold text-xl text-[#2b3e50]">EMPLOYMENT CONTRACT</h1>
                    
                    <div className="font-medium text-[#2b3e50]">
                      {safeVal(formData.employeeName)}<br/>
                      {safeVal(formData.employeeAddress)}
                    </div>
                    
                    <div>{safeVal(formData.letterDate)}</div>
                    
                    <div>Dear {safeVal(formData.employeeName)},</div>
                    
                    <p>
                      We have pleasure in confirming our offer of {safeVal(formData.employmentStatus)} employment with DUNWELL EXECUTIVE HEALTHCARE AND WELLNESS (herein referred to as "DEHW") in the position of {safeVal(formData.position)}, commencing on {safeVal(formData.startDate)}. This position is {safeVal(formData.employmentStatus)} and ongoing, subject to the terms and conditions outlined in this employment contract. This contract is subject to a favourable report on verification of your Personal Credentials.
                    </p>

                    <p>The terms and conditions of such employment are set out below:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>You will be reporting to the {safeVal(formData.supervisor)}.</li>
                      <li>You will have no expectation, nor does the employer create any expectation that your contract would be extended past the above-mentioned fixed period. No additional discharge benefits, severance and/or related payments will be due on termination.</li>
                      <li>You shall be bound by the terms and conditions of service as stated in the DEHW Program Policy & Procedure Manual and the Employee handbook.</li>
                    </ul>

                    <div>
                      <h3 className="font-bold text-primary border-b border-primary/20 pb-1 mt-8 mb-3 text-sm uppercase tracking-wider">Article 1: Job Description</h3>
                      <p>Your roles and responsibilities are outlined in your job description. Your job description will be fully discussed with you by the {safeVal(formData.supervisor)} to whom you report.</p>
                    </div>

                    <div>
                      <h3 className="font-bold text-primary border-b border-primary/20 pb-1 mt-8 mb-3 text-sm uppercase tracking-wider">Article 2: Remuneration</h3>
                      <p>Your remuneration shall consist of a gross consolidated salary of:<br/>
                      {safeVal(formData.annualSalary)} per annum; or<br/>
                      {safeVal(formData.monthlySalary)} per month.</p>
                    </div>

                    <div>
                      <h3 className="font-bold text-primary border-b border-primary/20 pb-1 mt-8 mb-3 text-sm uppercase tracking-wider">Article 7: Place of Work</h3>
                      <p>Your place of work is situated at {safeVal(formData.placeOfWork)}.</p>
                    </div>

                    <div className="pt-12 mt-12 border-t border-slate-200">
                      <p className="mb-8">We take pleasure in welcoming you to the DEHW team and look forward to working with you.</p>
                      
                      <div className="grid grid-cols-2 gap-8 mt-12">
                        <div>
                          <div className="text-sm font-bold text-slate-400 mb-8">RECOMMENDED BY:</div>
                          <div className="border-b-2 border-dashed border-slate-300 relative h-12 flex items-end justify-center">
                            {session.projectManagerSignature ? (
                              <img src={session.projectManagerSignature} className="max-h-16 absolute bottom-0 mix-blend-multiply" alt="Signature"/>
                            ) : <span className="text-slate-300 text-sm italic absolute bottom-1">Project Manager Signature</span>}
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            <strong>Project Manager</strong><br/>
                            Date: {session.projectManagerSignedAt ? format(new Date(session.projectManagerSignedAt), "dd MMM yyyy") : '___'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-400 mb-8">APPROVED BY:</div>
                          <div className="border-b-2 border-dashed border-slate-300 relative h-12 flex items-end justify-center">
                            {session.directorSignature ? (
                              <img src={session.directorSignature} className="max-h-16 absolute bottom-0 mix-blend-multiply" alt="Signature"/>
                            ) : <span className="text-slate-300 text-sm italic absolute bottom-1">Director Signature</span>}
                          </div>
                          <div className="mt-2 text-sm text-slate-600">
                            <strong>Director</strong><br/>
                            Date: {session.directorSignedAt ? format(new Date(session.directorSignedAt), "dd MMM yyyy") : '___'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-20">
                        <h2 className="text-center font-bold text-lg mb-8 uppercase">Acceptance Clause</h2>
                        <p className="mb-8">I hereby accept and understand the conditions of employment as set out in this offer of fixed term employment.</p>
                        
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <div className="border-b-2 border-dashed border-slate-300 relative h-12 flex items-end justify-center">
                              {session.employeeSignature ? (
                                <img src={session.employeeSignature} className="max-h-16 absolute bottom-0 mix-blend-multiply" alt="Signature"/>
                              ) : <span className="text-slate-300 text-sm italic absolute bottom-1">Employee Signature</span>}
                            </div>
                            <div className="mt-2 text-sm text-slate-600">
                              <strong>Employee:</strong> {safeVal(formData.employeeName)}<br/>
                              Date: {session.employeeSignedAt ? format(new Date(session.employeeSignedAt), "dd MMM yyyy") : '___'}
                            </div>
                          </div>
                          <div>
                            <div className="border-b-2 border-dashed border-slate-300 relative h-12 flex items-end justify-center">
                              {session.witnessSignature ? (
                                <img src={session.witnessSignature} className="max-h-16 absolute bottom-0 mix-blend-multiply" alt="Signature"/>
                              ) : <span className="text-slate-300 text-sm italic absolute bottom-1">Witness Signature</span>}
                            </div>
                            <div className="mt-2 text-sm text-slate-600">
                              <strong>Witness:</strong> {safeVal(session.witnessName || '')}<br/>
                              Date: {session.witnessSignedAt ? format(new Date(session.witnessSignedAt), "dd MMM yyyy") : '___'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="offer" className="mt-0 h-full">
                <div className="bg-white max-w-[800px] mx-auto min-h-[1000px] shadow-md border border-slate-200 p-8 md:p-12 mb-8">
                  <div className="flex items-center gap-4 mb-8 border-b-2 border-primary pb-4">
                    <img src={logoUrl} alt="Logo" className="h-16 w-auto" />
                    <div>
                      <h2 className="text-xl font-bold text-[#2b3e50] tracking-tight">DUNWELL YOUTH PRIORITY CLINIC</h2>
                      <p className="text-sm text-slate-500">Executive Healthcare and Wellness<br/>Johannesburg, South Africa</p>
                    </div>
                  </div>

                  <div className="space-y-6 text-[15px] leading-relaxed text-slate-700">
                    <h1 className="text-center font-bold text-xl text-[#2b3e50] mb-8">FORMAL OFFER OF EMPLOYMENT</h1>
                    
                    <div className="grid grid-cols-[200px_1fr] gap-3 bg-slate-50 p-6 rounded border border-slate-100 mb-8">
                      <div className="font-bold">Employee Name:</div><div>{safeVal(formData.employeeName)}</div>
                      <div className="font-bold">Offer Date:</div><div>{safeVal(formData.letterDate)}</div>
                      <div className="font-bold">Position Title:</div><div>{safeVal(formData.position)}</div>
                      <div className="font-bold">Employment Status:</div><div>{safeVal(formData.employmentStatus)}</div>
                      <div className="font-bold">Monthly Compensation:</div><div>{safeVal(formData.monthlySalary)}</div>
                      <div className="font-bold">Start Date:</div><div>{safeVal(formData.startDate)}</div>
                      <div className="font-bold">Immediate Supervisor:</div><div>{safeVal(formData.supervisor)}</div>
                    </div>
                    
                    <div>Dear {safeVal(formData.employeeName)},</div>
                    
                    <p>
                      We are pleased to extend you a formal offer of employment with Dunwell Executive Healthcare and Wellness in the position of {safeVal(formData.position)} based in {safeVal(formData.placeOfWork)}.
                    </p>

                    <h3 className="font-bold text-primary border-b border-primary/20 pb-1 mt-8 mb-3 text-sm uppercase tracking-wider">Acceptance of Offer</h3>
                    <p>I agree by signing below that I understand and agree to the terms and conditions of this offer extended by Dunwell Executive Healthcare and Wellness and no other terms apply.</p>
                    
                    <div className="w-64 mt-6">
                      <div className="border-b-2 border-dashed border-slate-300 relative h-12 flex items-end justify-center">
                        {session.employeeSignature ? (
                          <img src={session.employeeSignature} className="max-h-16 absolute bottom-0 mix-blend-multiply" alt="Signature"/>
                        ) : <span className="text-slate-300 text-sm italic absolute bottom-1">Employee Signature</span>}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Date: {session.employeeSignedAt ? format(new Date(session.employeeSignedAt), "dd MMM yyyy") : '___'}
                      </div>
                    </div>

                    <h3 className="font-bold text-primary border-b border-primary/20 pb-1 mt-12 mb-3 text-sm uppercase tracking-wider">Company Approval</h3>
                    <div className="w-64 mt-6">
                      <div className="border-b-2 border-dashed border-slate-300 relative h-12 flex items-end justify-center">
                        {session.companySignature ? (
                          <img src={session.companySignature} className="max-h-16 absolute bottom-0 mix-blend-multiply" alt="Signature"/>
                        ) : <span className="text-slate-300 text-sm italic absolute bottom-1">Company Signature</span>}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Date: {session.companySignedAt ? format(new Date(session.companySignedAt), "dd MMM yyyy") : '___'}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column: Controls (40%) */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4 h-full min-h-0">
          
          {/* Share Block */}
          <Card className="border-primary/20 shadow-sm bg-primary/5 flex-shrink-0">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <LinkIcon className="w-4 h-4" />
                  <h3>Share Workspace</h3>
                </div>
                <Badge variant="outline" className="bg-white">Signatures Required</Badge>
              </div>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={window.location.href} 
                  className="bg-white border-primary/20 text-xs text-slate-600 focus-visible:ring-primary/30 h-9"
                />
                <Button 
                  onClick={handleCopyLink} 
                  size="icon" 
                  variant="outline"
                  className={`h-9 w-9 flex-shrink-0 ${copySuccess ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white hover:bg-slate-50"}`}
                >
                  {copySuccess ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>

          {/* Signatures Block */}
          <Card className="border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white z-10 flex-shrink-0">
              <h2 className="text-lg font-bold text-[#2b3e50] font-serif flex items-center">
                <PenTool className="w-4 h-4 mr-2 text-slate-400" />
                Capture Signatures
              </h2>
              <p className="text-xs text-slate-500 mt-1">Signatures sync across both documents automatically.</p>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/50">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <User className="w-3 h-3 mr-1" /> Employee & Witness
                </h3>
                <SignatureCanvas 
                  label="Employee Signature" 
                  role="employee"
                  onSign={onSign('employee')}
                  existingSignature={session.employeeSignature}
                  existingDate={session.employeeSignedAt}
                />
                <SignatureCanvas 
                  label="Witness Signature" 
                  role="witness"
                  requireName={true}
                  signerName={session.witnessName}
                  onSign={onSign('witness')}
                  existingSignature={session.witnessSignature}
                  existingDate={session.witnessSignedAt}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Building className="w-3 h-3 mr-1" /> Internal Approval
                </h3>
                <SignatureCanvas 
                  label="Project Manager" 
                  role="project_manager"
                  requireName={true}
                  signerName={(session as any).projectManagerName}
                  onSign={onSign('project_manager')}
                  existingSignature={session.projectManagerSignature}
                  existingDate={session.projectManagerSignedAt}
                />
                <SignatureCanvas 
                  label="Director" 
                  role="director"
                  onSign={onSign('director')}
                  existingSignature={session.directorSignature}
                  existingDate={session.directorSignedAt}
                />
                <SignatureCanvas 
                  label="Company Representative" 
                  role="company"
                  onSign={onSign('company')}
                  existingSignature={session.companySignature}
                  existingDate={session.companySignedAt}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white space-y-3 flex-shrink-0">
              <PdfGenerator session={session} type="employment_contract" />
              <PdfGenerator session={session} type="formal_offer" />
            </div>
          </Card>

        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}} />
    </div>
  );
}
