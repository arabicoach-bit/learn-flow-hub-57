import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { useCreateTrialStudent } from '@/hooks/use-trial-students';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  parent_guardian_name: z.string().max(100).optional(),
  phone: z.string().min(8, 'Phone number is required').max(20),
  age: z.coerce.number().min(3).max(100).optional().or(z.literal('')),
  gender: z.string().optional(),
  school: z.string().max(100).optional(),
  year_group: z.string().optional(),
  interested_program: z.string().optional(),
  student_level: z.string().optional(),
  teacher_id: z.string().optional(),
  trial_date: z.string().optional(),
  trial_time: z.string().optional(),
  notes: z.string().max(1000).optional(),
  handled_by: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTrialStudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTrialStudentForm({ open, onOpenChange }: AddTrialStudentFormProps) {
  const { toast } = useToast();
  const { data: teachers } = useTeachers();
  const { data: programs } = usePrograms();
  const createTrialStudent = useCreateTrialStudent();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      parent_guardian_name: '',
      phone: '',
      age: '',
      gender: '',
      school: '',
      year_group: '',
      interested_program: '',
      student_level: '',
      teacher_id: '',
      trial_date: '',
      trial_time: '',
      notes: '',
      handled_by: '',
    },
  });

  const selectedTeacherId = form.watch('teacher_id');
  const selectedTeacher = teachers?.find(t => t.teacher_id === selectedTeacherId);

  const onSubmit = async (values: FormValues) => {
    try {
      await createTrialStudent.mutateAsync({
        name: values.name,
        parent_guardian_name: values.parent_guardian_name || undefined,
        phone: values.phone,
        age: values.age ? Number(values.age) : undefined,
        gender: values.gender || undefined,
        school: values.school || undefined,
        year_group: values.year_group || undefined,
        interested_program: values.interested_program || undefined,
        student_level: values.student_level || undefined,
        teacher_id: values.teacher_id || undefined,
        trial_date: values.trial_date || undefined,
        trial_time: values.trial_time || undefined,
        notes: values.notes || undefined,
        handled_by: values.handled_by || undefined,
      });

      toast({
        title: 'Trial student added',
        description: 'The trial student has been added successfully.',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add trial student. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Trial Student</DialogTitle>
          <DialogDescription>
            Add a new trial student for a 30-minute trial lesson. Teacher payment will be split 50/50.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            30 min lesson
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            50/50 payment split
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter student name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_guardian_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent/Guardian Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter parent name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Contact *</FormLabel>
                    <FormControl>
                      <Input placeholder="00971-50-123-456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter age" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter school name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 
                          'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'].map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interested_program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interested Programme</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select programme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs?.map(program => (
                          <SelectItem key={program.program_id} value={program.name}>
                            {program.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="Arabic B student">Arabic B student</SelectItem>
                        <SelectItem value="IGCSE">IGCSE</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="student_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Upper Intermediate">Upper Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacher_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Teacher</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers?.map(teacher => (
                          <SelectItem key={teacher.teacher_id} value={teacher.teacher_id}>
                            {teacher.name} (AED {teacher.rate_per_lesson}/lesson)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTeacher && (
                      <FormDescription className="text-xs">
                        Teacher gets AED {(selectedTeacher.rate_per_lesson / 2).toFixed(2)}, 
                        Admin gets AED {(selectedTeacher.rate_per_lesson / 2).toFixed(2)}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="trial_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trial Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trial_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trial Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="handled_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handled By</FormLabel>
                  <FormControl>
                    <Input placeholder="Who is handling this trial?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about the trial student..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTrialStudent.isPending}>
                {createTrialStudent.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Trial Student
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
