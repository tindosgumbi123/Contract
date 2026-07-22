import { useState } from 'react';
import logoUrl from '@assets/Logo_Registered_.jpg_1784563137893.jpeg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import { Plus, Search, CheckCircle2, Clock, FileEdit, Building, UserPlus, FileText, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListSessions, useCreateSession, getListSessionsQueryKey } from '@workspace/api-client-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';

export default function Dashboard() {
  const { data: sessions, isLoading } = useListSessions();
  const createSession = useCreateSession();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteToken, setDeleteToken] = useState<string | null>(null);

  const deleteSession = useMutation({
    mutationFn: async (shareToken: string) => {
      const res = await fetch(`/api/sessions/${shareToken}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      setDeleteToken(null);
    },
  });

  // New Employee Form State
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeAddress: '',
    letterDate: format(new Date(), 'yyyy-MM-dd'),
    position: '',
    employmentStatus: 'Permanent',
    startDate: '',
    monthlySalary: '',
    annualSalary: '',
    supervisor: '',
    placeOfWork: 'Dunwell Clinic'
  });

  const handleCreateSession = () => {
    if (!formData.employeeName.trim()) return;
    
    createSession.mutate(
      {
        data: {
          contractType: 'employment_contract',
          ...formData
        }
      },
      {
        onSuccess: (session) => {
          setIsCreateModalOpen(false);
          setStep(1);
          setFormData({
            employeeName: '',
            employeeAddress: '',
            letterDate: format(new Date(), 'yyyy-MM-dd'),
            position: '',
            employmentStatus: 'Permanent',
            startDate: '',
            monthlySalary: '',
            annualSalary: '',
            supervisor: '',
            placeOfWork: 'Dunwell Clinic'
          });
          queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
          setLocation(`/session/${session.shareToken}`);
        }
      }
    );
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'monthlySalary') {
        const numericVal = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (!isNaN(numericVal)) {
          next.annualSalary = `R ${(numericVal * 12).toLocaleString('en-ZA', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        } else {
          next.annualSalary = '';
        }
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Fully Signed</Badge>;
      case 'pending_signature':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200"><FileEdit className="w-3 h-3 mr-1" /> Draft</Badge>;
    }
  };

  const filteredSessions = sessions?.filter(s => 
    s.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: sessions?.length || 0,
    draft: sessions?.filter(s => s.status === 'draft').length || 0,
    pending: sessions?.filter(s => s.status === 'pending_signature').length || 0,
    signed: sessions?.filter(s => s.status === 'signed').length || 0,
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Dunwell Logo" className="h-10 w-auto" />
            <div>
              <div className="text-[#2b3e50] font-bold text-base leading-tight tracking-tight">Dunwell Youth Priority Clinic</div>
              <div className="text-xs text-slate-500 font-medium">Contract Generator</div>
            </div>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-sm rounded-full px-5">
            <Plus className="w-4 h-4 mr-2" />
            New Employee
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border-none shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total</div>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{stats.draft}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Drafts</div>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{stats.pending}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending</div>
            </div>
          </Card>
          <Card className="p-4 border-none shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{stats.signed}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Signed</div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold text-[#2b3e50] font-serif">Employee Contracts</h1>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search employees or positions..." 
                className="pl-10 bg-white border-slate-200 rounded-full"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              Loading records...
            </div>
          ) : filteredSessions?.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-transparent shadow-none">
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                  <UserPlus className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-[#2b3e50] mb-2 font-serif">No Employees Found</h3>
                <p className="text-slate-500 max-w-md mb-8">
                  {searchQuery ? "No employees match your search criteria." : "Start by adding your first employee to generate their Employment Contract and Formal Offer."}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary rounded-full px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Employee
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSessions?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(session => (
                <Card key={session.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {getInitials(session.employeeName || '')}
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                    
                    <h3 className="font-bold text-lg text-[#2b3e50] mb-1 line-clamp-1">{session.employeeName || 'Unnamed Employee'}</h3>
                    <div className="text-sm text-slate-500 font-medium mb-4 flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                      <span className="line-clamp-1">{session.position || 'Position not set'}</span>
                    </div>
                    
                    <div className="space-y-2 mt-auto">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Created</span>
                        <span className="text-slate-600 font-medium">{format(new Date(session.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Salary</span>
                        <span className="text-slate-600 font-medium">{session.monthlySalary || '—'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border-t border-slate-100 p-3 flex gap-2">
                    <Link href={`/session/${session.shareToken}`} className="flex-1">
                      <Button variant="outline" className="w-full bg-white hover:bg-slate-50 hover:text-primary transition-colors border-slate-200">
                        Open Workspace
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-slate-200 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 shrink-0"
                      onClick={() => setDeleteToken(session.shareToken!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteToken} onOpenChange={(open) => { if (!open) setDeleteToken(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this employee's contract and all signatures. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteToken && deleteSession.mutate(deleteToken)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 flex flex-col" style={{ maxHeight: '88vh' }}>
          <div className="bg-primary/5 p-6 border-b border-slate-100 shrink-0">
            <DialogTitle className="font-serif text-2xl text-[#2b3e50]">New Employee</DialogTitle>
            <DialogDescription className="mt-1">
              Step {step} of 3 • {step === 1 ? 'Personal Details' : step === 2 ? 'Job Details' : 'Review'}
            </DialogDescription>
            <div className="flex gap-2 mt-4">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-slate-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`} />
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Full Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="employeeName" 
                    value={formData.employeeName}
                    onChange={e => handleChange('employeeName', e.target.value)}
                    placeholder="e.g. Jane Doe"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeAddress">Home Address <span className="text-red-500">*</span></Label>
                  <Textarea 
                    id="employeeAddress" 
                    value={formData.employeeAddress}
                    onChange={e => handleChange('employeeAddress', e.target.value)}
                    placeholder="Full residential address"
                    className="resize-none h-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="letterDate">Letter Date</Label>
                  <Input 
                    id="letterDate" 
                    type="date"
                    value={formData.letterDate}
                    onChange={e => handleChange('letterDate', e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="position">Position / Job Title <span className="text-red-500">*</span></Label>
                    <Input 
                      id="position" 
                      value={formData.position}
                      onChange={e => handleChange('position', e.target.value)}
                      placeholder="e.g. Registered Nurse"
                      autoFocus
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employmentStatus">Status</Label>
                    <Select value={formData.employmentStatus} onValueChange={(v) => handleChange('employmentStatus', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                        <SelectItem value="Fixed Term">Fixed Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input 
                      id="startDate" 
                      type="date"
                      value={formData.startDate}
                      onChange={e => handleChange('startDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlySalary">Monthly Salary</Label>
                    <Input 
                      id="monthlySalary" 
                      value={formData.monthlySalary}
                      onChange={e => handleChange('monthlySalary', e.target.value)}
                      placeholder="e.g. R 9,500.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="annualSalary">Annual Salary</Label>
                    <Input 
                      id="annualSalary" 
                      value={formData.annualSalary}
                      onChange={e => handleChange('annualSalary', e.target.value)}
                      placeholder="Auto-computed"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="supervisor">Immediate Supervisor</Label>
                    <Input 
                      id="supervisor" 
                      value={formData.supervisor}
                      onChange={e => handleChange('supervisor', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="placeOfWork">Place of Work</Label>
                    <Input 
                      id="placeOfWork" 
                      value={formData.placeOfWork}
                      onChange={e => handleChange('placeOfWork', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
                  <h4 className="font-semibold text-slate-800 mb-4 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-primary" />
                    Documents to be generated
                  </h4>
                  <ul className="space-y-3 text-sm text-slate-600 mb-6">
                    <li className="flex items-start"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 mt-0.5" /> Employment Contract</li>
                    <li className="flex items-start"><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500 mt-0.5" /> Formal Offer of Employment</li>
                  </ul>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm border-t border-slate-200 pt-4 mt-2">
                    <div>
                      <span className="text-slate-400 block text-xs">Employee</span>
                      <span className="font-medium text-slate-800">{formData.employeeName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Position</span>
                      <span className="font-medium text-slate-800">{formData.position || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Start Date</span>
                      <span className="font-medium text-slate-800">{formData.startDate ? format(new Date(formData.startDate), 'MMM d, yyyy') : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">Compensation</span>
                      <span className="font-medium text-slate-800">{formData.monthlySalary || '—'} /mo</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            )}
            
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)} 
                disabled={step === 1 ? (!formData.employeeName || !formData.employeeAddress) : !formData.position}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreateSession} 
                disabled={createSession.isPending} 
                className="bg-primary hover:bg-primary/90 text-white shadow-md"
              >
                {createSession.isPending ? 'Creating...' : 'Create Contracts'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
