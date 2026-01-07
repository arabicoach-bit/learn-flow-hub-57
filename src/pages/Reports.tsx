import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText } from 'lucide-react';

export default function Reports() {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and view analytics reports</p>
        </div>

        <Tabs defaultValue="payroll">
          <TabsList>
            <TabsTrigger value="payroll">Teacher Payroll</TabsTrigger>
            <TabsTrigger value="renewals">Student Renewals</TabsTrigger>
            <TabsTrigger value="packages">Package Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="payroll" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Teacher Payroll Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a date range to generate payroll report</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="renewals" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Pending Renewals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">Students requiring package renewal will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Package Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">Package statistics and summaries will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
