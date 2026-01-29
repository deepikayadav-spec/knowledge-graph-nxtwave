import { ChevronDown, BookOpen, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CourseSelectorProps {
  courses: string[];
  selectedCourse: string | null;
  onCourseSelect: (course: string | null) => void;
}

export function CourseSelector({
  courses,
  selectedCourse,
  onCourseSelect,
}: CourseSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {selectedCourse ? (
            <>
              <BookOpen className="h-4 w-4" />
              {selectedCourse}
            </>
          ) : (
            <>
              <LayoutGrid className="h-4 w-4" />
              All Concepts
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          onClick={() => onCourseSelect(null)}
          className="gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          All Concepts
        </DropdownMenuItem>
        {courses.length > 0 && <DropdownMenuSeparator />}
        {courses.map((course) => (
          <DropdownMenuItem
            key={course}
            onClick={() => onCourseSelect(course)}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            {course}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
