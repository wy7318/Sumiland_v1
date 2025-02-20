import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Building2, User, Send, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  type: 'Design Inquiry' | 'Career' | 'Other' | '';
  subType: string;
  title: string;
  description: string;
  resume: File | null;
};

const INITIAL_FORM_DATA: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  phone: '',
  type: '',
  subType: '',
  title: '',
  description: '',
  resume: null
};

export function ContactSection() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, resume: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. Check if customer exists
      const { data: existingCustomers, error: customerError } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('email', formData.email)
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        throw customerError;
      }

      let contactId;

      if (!existingCustomers) {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([{
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
            company: formData.company,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) throw createError;
        contactId = newCustomer.customer_id;
      } else {
        contactId = existingCustomers.customer_id;
      }

      // 2. Upload resume if exists
      let resumeUrl = null;
      if (formData.resume && formData.type === 'Career') {
        const fileExt = formData.resume.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('Sumiland Design')
          .upload(`resumes/${fileName}`, formData.resume);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('Sumiland Design')
          .getPublicUrl(`resumes/${fileName}`);
          
        resumeUrl = publicUrl;
      }

      // 3. Create case
      const { error: caseError } = await supabase
        .from('cases')
        .insert([{
          title: formData.title || `${formData.type} - ${formData.firstName} ${formData.lastName}`,
          type: formData.type,
          sub_type: formData.type === 'Design Inquiry' ? formData.subType : null,
          status: 'New',
          contact_id: contactId,
          description: formData.description,
          resume_url: resumeUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (caseError) throw caseError;

      setSuccess(true);
      setFormData(INITIAL_FORM_DATA);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while submitting the form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 px-4 bg-gray-50" id="contact">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-bold text-center mb-16"
        >
          Get in Touch
        </motion.h2>

        {success ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <h3 className="text-2xl font-semibold text-primary-600 mb-4">Thank You!</h3>
            <p className="text-gray-600 mb-8">
              We've received your message and will get back to you soon.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Send Another Message
            </button>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8"
          >
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
                {error}
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="John"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="Company Name"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6">Request Details</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type of Request *
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ 
                      ...prev, 
                      type: e.target.value as FormData['type'],
                      subType: '',
                      title: '',
                      description: '',
                      resume: null
                    }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Design Inquiry">Design Inquiry</option>
                    <option value="Career">Career</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.type === 'Design Inquiry' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Design Category *
                      </label>
                      <select
                        value={formData.subType}
                        onChange={e => setFormData(prev => ({ ...prev, subType: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        required
                      >
                        <option value="">Select Category</option>
                        <option value="Graphic Design">Graphic Design</option>
                        <option value="Website Design">Website Design</option>
                        <option value="Package Design">Package Design</option>
                        <option value="Branding">Branding</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        placeholder="Brief title for your project"
                        required
                      />
                    </div>
                  </>
                )}

                {formData.type === 'Career' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position of Interest *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        placeholder="Position you're applying for"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resume *
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          required
                        />
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "w-full px-4 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                            formData.resume
                              ? "border-primary-500 bg-primary-50"
                              : "border-gray-300 hover:border-primary-500 hover:bg-gray-50"
                          )}
                        >
                          {formData.resume ? (
                            <div className="flex items-center justify-between">
                              <span className="text-primary-600">{formData.resume.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData(prev => ({ ...prev, resume: null }));
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                  }
                                }}
                                className="p-1 hover:bg-white rounded-full"
                              >
                                <X className="w-5 h-5 text-primary-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Upload className="w-8 h-8 text-gray-400 mb-2" />
                              <span className="text-gray-500">Click to upload resume (PDF, DOC, DOCX)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {formData.type === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="Subject of your inquiry"
                      required
                    />
                  </div>
                )}

                {formData.type && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.type === 'Career' ? 'Brief Introduction' : 'Description'} *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={5}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder={
                        formData.type === 'Career'
                          ? "Tell us about yourself and why you'd like to join our team"
                          : "Please provide details about your request"
                      }
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </section>
  );
}