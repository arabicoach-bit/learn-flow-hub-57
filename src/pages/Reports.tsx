import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherPayrollReport } from '@/components/reports/TeacherPayrollReport';
import { useStudents } from '@/hooks/use-students';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { getWalletColor, formatDate, formatCurrency } from '@/lib/wallet-utils';
import { usePackages } from '@/hooks/use-packages';
import { useNavigate } from 'react-router-dom';

export default function Reports() {
  const navigate = useNavigate();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: packages, isLoading: packagesLoading } = usePackages();
  
  // Filter students needing renewal (wallet <= 2)
  const renewalStudents = students?.filter(s => s.wallet_balance <= 2) || [];
  
  // Filter completed packages
  const completedPackages = packages?.filter(p => 
    p.status === 'Completed' || p.lessons_used >= p.lessons_purchased
  ) || [];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and view analytics reports</p>
        </div>

        <Tabs defaultValue="payroll">
          <TabsList>
            <TabsTrigger value="payroll">Teacher Payroll</TabsTrigger>
            <TabsTrigger value="renewals">
              Student Renewals
              {renewalStudents.length > 0 && (
                <Badge variant="destructive" className="ml-2">{renewalStudents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="packages">Package Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="payroll" className="mt-6">
            <TeacherPayrollReport />
          </TabsContent>

          <TabsContent value="renewals" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Pending Renewals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : renewalStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No students need renewal at this time</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Class</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renewalStudents.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.phone}</TableCell>
                          <TableCell>
                            <span 
                              className="font-bold px-2 py-1 rounded"
                              style={{ 
                                backgroundColor: `hsl(${getWalletColor(student.wallet_balance)} / 0.15)`,
                                color: `hsl(${getWalletColor(student.wallet_balance)})`
                              }}
                            >
                              {student.wallet_balance}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                student.status === 'Active' ? 'status-active' :
                                student.status === 'Grace' ? 'status-grace' : 'status-blocked'
                              }
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.classes?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Completed Packages
                </CardTitle>
                <Button onClick={() => navigate('/admin/reports/package-summaries')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Full Summaries
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : completedPackages.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No completed packages</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Lessons</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedPackages.map((pkg) => (
                        <TableRow key={pkg.package_id}>
                          <TableCell className="font-medium">{pkg.students?.name || '-'}</TableCell>
                          <TableCell>{formatDate(pkg.payment_date)}</TableCell>
                          <TableCell>{formatCurrency(pkg.amount)}</TableCell>
                          <TableCell>{pkg.lessons_purchased}</TableCell>
                          <TableCell>{pkg.lessons_used}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="status-grace">
                              {pkg.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
