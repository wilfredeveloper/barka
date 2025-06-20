"use client";

import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreateTeamMemberData, UpdateTeamMemberData, TeamMember } from '@/lib/api/team';

const ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'qa_engineer', label: 'QA Engineer' },
  { value: 'business_analyst', label: 'Business Analyst' },
  { value: 'stakeholder', label: 'Stakeholder' },
  { value: 'client', label: 'Client' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'consultant', label: 'Consultant' },
];

interface TeamMemberFormProps {
  initialData?: TeamMember;
  onSubmit: (data: CreateTeamMemberData | UpdateTeamMemberData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode: 'create' | 'edit';
}

export function TeamMemberForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false, 
  mode 
}: TeamMemberFormProps) {
  const [formData, setFormData] = useState<CreateTeamMemberData | UpdateTeamMemberData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: initialData?.role || '',
    customRole: initialData?.customRole || '',
    status: initialData?.status || 'active',
    phone: initialData?.phone || '',
    department: initialData?.department || '',
    title: initialData?.title || '',
    hourlyRate: initialData?.hourlyRate || undefined,
    capacity: {
      hoursPerWeek: initialData?.capacity?.hoursPerWeek || 40,
      availability: initialData?.capacity?.availability || 'full_time',
      timezone: initialData?.capacity?.timezone || 'UTC',
      workingHours: {
        start: initialData?.capacity?.workingHours?.start || '09:00',
        end: initialData?.capacity?.workingHours?.end || '17:00',
      },
    },
    skills: initialData?.skills ? [...initialData.skills] : [],
    expertise: initialData?.expertise ? [...initialData.expertise] : [],
    certifications: initialData?.certifications ? [...initialData.certifications] : [],
    tags: initialData?.tags ? [...initialData.tags] : [],
    notes: initialData?.notes || '',
  });

  const [customRole, setCustomRole] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [expertiseInput, setExpertiseInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCapacityChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      capacity: {
        ...prev.capacity!,
        [field]: value,
      },
    }));
  };

  const handleWorkingHoursChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      capacity: {
        ...prev.capacity!,
        workingHours: {
          ...prev.capacity!.workingHours!,
          [field]: value,
        },
      },
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills?.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s !== skill) || [],
    }));
  };

  const addExpertise = () => {
    if (expertiseInput.trim() && !formData.expertise?.includes(expertiseInput.trim())) {
      setFormData(prev => ({
        ...prev,
        expertise: [...(prev.expertise || []), expertiseInput.trim()],
      }));
      setExpertiseInput('');
    }
  };

  const removeExpertise = (expertise: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise?.filter(e => e !== expertise) || [],
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (formData.role === 'other' && !customRole.trim()) {
      newErrors.customRole = 'Custom role is required when role is "Other"';
    }

    if (formData.hourlyRate !== undefined && formData.hourlyRate !== null) {
      if (formData.hourlyRate < 10) {
        newErrors.hourlyRate = 'Hourly rate must be at least $10';
      } else if (formData.hourlyRate > 500) {
        newErrors.hourlyRate = 'Hourly rate cannot exceed $500';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        customRole: formData.role === 'other' ? customRole : undefined,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            {mode === 'create' ? 'Enter the team member\'s basic details' : 'Update team member information'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role || ''}
                onValueChange={(value) => handleInputChange('role', value)}
              >
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role}</p>
              )}
            </div>

            {mode === 'edit' && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.role === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customRole">Custom Role *</Label>
                <Input
                  id="customRole"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="Enter custom role"
                  className={errors.customRole ? 'border-red-500' : ''}
                />
                {errors.customRole && (
                  <p className="text-sm text-red-500">{errors.customRole}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity & Availability</CardTitle>
          <CardDescription>
            Set working hours, availability, and compensation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hoursPerWeek">Hours per Week</Label>
              <Input
                id="hoursPerWeek"
                type="number"
                min="1"
                max="168"
                value={formData.capacity?.hoursPerWeek || 40}
                onChange={(e) => handleCapacityChange('hoursPerWeek', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Select
                value={formData.capacity?.availability || 'full_time'}
                onValueChange={(value) => handleCapacityChange('availability', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hourlyRate"
                  type="number"
                  min="10"
                  max="500"
                  step="0.01"
                  placeholder="Enter hourly rate"
                  value={formData.hourlyRate || ''}
                  onChange={(e) => handleInputChange('hourlyRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className={`pl-10 ${errors.hourlyRate ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.hourlyRate && (
                <p className="text-sm text-red-500">{errors.hourlyRate}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Valid range: $10 - $500 per hour (optional)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Expertise */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
          <CardDescription>
            Add relevant skills and areas of expertise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <div className="flex space-x-2">
              <Input
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Enter a skill"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button type="button" onClick={addSkill} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.skills?.map((skill, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer">
                  {skill}
                  <X
                    className="h-3 w-3 ml-1"
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expertise">Areas of Expertise</Label>
            <div className="flex space-x-2">
              <Input
                id="expertise"
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                placeholder="Enter area of expertise"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addExpertise();
                  }
                }}
              />
              <Button type="button" onClick={addExpertise} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.expertise?.map((exp, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer">
                  {exp}
                  <X
                    className="h-3 w-3 ml-1"
                    onClick={() => removeExpertise(exp)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Team Member' : 'Update Team Member'}
        </Button>
      </div>
    </form>
  );
}
