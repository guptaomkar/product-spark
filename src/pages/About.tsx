import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { 
  Target, 
  Users, 
  Zap, 
  Shield, 
  Globe, 
  Award,
  Building2,
  CheckCircle,
  ArrowRight,
  Lock,
  Settings,
  Mail,
  Clock,
  Headphones,
  ShieldCheck,
  Database,
  Sparkles,
  Send,
  HelpCircle,
  FileUp,
  Download,
  CreditCard,
  Play,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  subject: z.string().trim().max(200, "Subject must be less than 200 characters").optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be less than 2000 characters")
});

const faqData = [
  {
    category: "Getting Started",
    icon: Play,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    questions: [
      {
        q: "How do I start using DataEnrich?",
        a: "Simply sign up for an account, upload your product data file (CSV or Excel), select the attributes you want to enrich, and click 'Start Enrichment'. Our AI agents will automatically fetch and populate the missing data for you."
      },
      {
        q: "What file formats are supported?",
        a: "We support CSV (.csv) and Excel (.xlsx, .xls) file formats. Your file should contain columns for MPN (Manufacturer Part Number) and optionally the Manufacturer name for better accuracy."
      },
      {
        q: "Do I need technical knowledge to use the platform?",
        a: "No! DataEnrich is designed to be user-friendly. Simply upload your file, map your columns, select attributes, and let our AI do the rest. No coding or technical expertise required."
      }
    ]
  },
  {
    category: "Data Enrichment",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    questions: [
      {
        q: "How does the enrichment process work?",
        a: "Our platform uses multiple AI agents and APIs to search manufacturer databases, product catalogs, and trusted sources. For each product (identified by MPN), we extract the requested attributes like specifications, dimensions, certifications, images, and more."
      },
      {
        q: "What attributes can be enriched?",
        a: "You can enrich a wide variety of attributes including: Product descriptions, Technical specifications, Dimensions & weight, Images & datasheets, Certifications, Categories, and custom attributes specific to your industry."
      },
      {
        q: "How accurate is the enrichment?",
        a: "We achieve 99.5% accuracy by cross-referencing multiple sources and using AI validation. Each enriched value is verified against trusted manufacturer databases to ensure data quality."
      },
      {
        q: "Can I enrich custom attributes?",
        a: "Yes! You can define custom attributes specific to your industry needs. Contact our support team for custom attribute configuration, and we'll set up tailored enrichment rules for your catalog."
      }
    ]
  },
  {
    category: "File Upload & Processing",
    icon: FileUp,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    questions: [
      {
        q: "How do I upload my product data?",
        a: "Click the 'Upload File' button on the dashboard, select your CSV or Excel file, and our system will automatically detect the columns. Map the MPN and Manufacturer columns, then proceed to attribute selection."
      },
      {
        q: "Is there a limit on file size or number of products?",
        a: "File size limits depend on your subscription plan. Free trial allows up to 100 products, while paid plans support thousands of products per batch. Check the Pricing page for specific limits."
      },
      {
        q: "How long does processing take?",
        a: "Processing time varies based on the number of products and attributes. Typically, 100 products with 5 attributes take about 2-3 minutes. Our parallel processing ensures optimal speed for bulk enrichment."
      }
    ]
  },
  {
    category: "Asset Download",
    icon: Download,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    questions: [
      {
        q: "How do I download product images and datasheets?",
        a: "After enrichment, go to the Asset Download panel. Select the products you want, choose asset types (images, PDFs), and click 'Download'. Assets are automatically renamed using MPN and packaged into a ZIP file."
      },
      {
        q: "What happens if an asset URL is broken?",
        a: "Our system gracefully handles broken or missing URLs. Failed downloads are logged and reported, while successful assets are still packaged for download. You'll see a summary of any missing assets."
      },
      {
        q: "Can I download assets in bulk?",
        a: "Yes! Select multiple products or use 'Select All' to download assets for your entire catalog. Assets are organized by product and delivered as a compressed ZIP file for easy management."
      }
    ]
  },
  {
    category: "Training Mode",
    icon: Settings,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    questions: [
      {
        q: "What is Training Mode?",
        a: "Training Mode allows you to teach our system how to extract data from specific manufacturer websites. By defining CSS selectors for different attributes, you create custom scraping rules for better accuracy."
      },
      {
        q: "How do I train a new manufacturer?",
        a: "Enter the manufacturer name and a sample product URL. Our system will load the page, and you can click on elements to define selectors for each attribute. Save the training to apply it to all future products from that manufacturer."
      },
      {
        q: "Can I edit or delete trainings?",
        a: "Yes! Go to the Saved Trainings section to view, edit, or delete manufacturer trainings. You can update selectors if website layouts change or add new attributes to existing trainings."
      }
    ]
  },
  {
    category: "Pricing & Credits",
    icon: CreditCard,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    questions: [
      {
        q: "How does the credit system work?",
        a: "Each enrichment request consumes credits based on your plan. 1 credit = 1 product enrichment. Credits are allocated monthly and unused credits don't roll over. View your remaining credits in the dashboard."
      },
      {
        q: "What happens when I run out of credits?",
        a: "When credits are exhausted, you can upgrade your plan or wait for the next billing cycle. We'll notify you when credits are running low so you can plan accordingly."
      },
      {
        q: "Can I upgrade or downgrade my plan?",
        a: "Yes! You can change your plan anytime from the Settings page. Upgrades take effect immediately with prorated billing. Downgrades apply at the next billing cycle."
      },
      {
        q: "Is there a free trial?",
        a: "Yes! New users get a free trial with 10 credits to test the platform. Experience the full power of DataEnrich before committing to a paid plan."
      }
    ]
  }
];

const About = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: result.data.name,
        email: result.data.email,
        subject: result.data.subject || null,
        message: result.data.message
      });

      if (error) throw error;

      toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">About Us</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Transforming <span className="text-gradient">Product Data</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We help businesses unlock the full potential of their product catalogs 
            through intelligent automation and AI-powered data enrichment.
          </p>
        </div>

        {/* Data Privacy & Security Section */}
        <section className="mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-green-500/30 p-8 md:p-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center animate-scale-in">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">Your Data, Your Control</h2>
                    <p className="text-green-600 dark:text-green-400 font-medium">100% Privacy Guaranteed</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-[1.02]">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">No Data Storage</h3>
                        <p className="text-sm text-muted-foreground">
                          We <span className="text-green-500 font-semibold">DO NOT store</span> any of your organization's data. 
                          Your product information is processed in real-time and never retained on our servers.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-[1.02]">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Database className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">No Data Usage</h3>
                        <p className="text-sm text-muted-foreground">
                          Your data is <span className="text-green-500 font-semibold">never used</span> for training, 
                          analytics, or any other purpose. Complete confidentiality assured.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="w-48 h-48 rounded-full border-4 border-dashed border-green-500/30 flex items-center justify-center animate-[spin_20s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
                          <Lock className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2">
                          <ShieldCheck className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2">
                          <Database className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Shield className="w-12 h-12 text-green-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Customization Section */}
        <section className="mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-indigo-500/10 border-2 border-purple-500/30 p-8 md:p-12">
              <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center animate-scale-in">
                    <Settings className="w-8 h-8 text-purple-500 animate-[spin_8s_linear_infinite]" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">Tailored to Your Needs</h2>
                    <p className="text-purple-600 dark:text-purple-400 font-medium">Custom Solutions Available</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-5 rounded-xl bg-background/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] group">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                      <Sparkles className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Custom Workflows</h3>
                    <p className="text-sm text-muted-foreground">
                      We can customize the software to match your exact business processes and requirements.
                    </p>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-background/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] group">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                      <Target className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Custom Attributes</h3>
                    <p className="text-sm text-muted-foreground">
                      Define and enrich custom product attributes specific to your industry and catalog needs.
                    </p>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-background/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] group">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                      <Globe className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">API Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Seamless integration with your existing systems through custom API configurations.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-center text-sm text-foreground">
                    <span className="font-semibold text-purple-500">Need something specific?</span> Our team will work with you to build exactly what your organization needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-sky-500/10 border-2 border-blue-500/30 p-8 md:p-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center animate-scale-in">
                    <Headphones className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">24/7 Dedicated Support</h2>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">We're Always Here for You</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02]">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">24-Hour Resolution</h3>
                        <p className="text-sm text-muted-foreground">
                          Any issues reported will be resolved within the next <span className="text-blue-500 font-semibold">24 hours</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02]">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Headphones className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Available 24x7</h3>
                        <p className="text-sm text-muted-foreground">
                          Our support team is available <span className="text-blue-500 font-semibold">around the clock</span>, every day of the week
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 text-center hover:scale-105 transition-transform duration-300">
                      <Mail className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">Drop us an email at</p>
                      <a 
                        href="mailto:support@dataenrichr.com" 
                        className="text-xl md:text-2xl font-bold text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        support@dataenrichr.com
                      </a>
                      <p className="text-sm text-muted-foreground mt-4">
                        Found an issue during execution? Let us know and we'll fix it promptly!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">FAQ</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about using DataEnrich. Can't find what you're looking for? 
                Contact our support team.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {faqData.map((category, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center`}>
                      <category.icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{category.category}</h3>
                  </div>
                  
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((faq, faqIdx) => (
                      <AccordionItem key={faqIdx} value={`${idx}-${faqIdx}`} className="border-border/50">
                        <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="mb-20">
          <div className="max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/30 p-8 md:p-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-4">
                    <Send className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Contact Us</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Get in Touch</h2>
                  <p className="text-muted-foreground">
                    Have questions or need assistance? Fill out the form below and we'll respond within 24 hours.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={errors.name ? 'border-destructive' : ''}
                      />
                      {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="What's this about?"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={errors.subject ? 'border-destructive' : ''}
                    />
                    {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us how we can help..."
                      rows={5}
                      value={formData.message}
                      onChange={handleInputChange}
                      className={errors.message ? 'border-destructive' : ''}
                    />
                    {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                DataEnrich was founded with a simple goal: eliminate the manual effort 
                required to maintain accurate, complete product specifications. We believe 
                that every business deserves access to enterprise-grade data enrichment 
                without the enterprise price tag.
              </p>
              <p className="text-muted-foreground">
                Our platform leverages cutting-edge AI technology to automatically 
                discover, validate, and populate product attributes from trusted sources, 
                saving thousands of hours of manual research.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">10M+</div>
                <p className="text-sm text-muted-foreground">Products Enriched</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">500+</div>
                <p className="text-sm text-muted-foreground">Enterprise Clients</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">99.5%</div>
                <p className="text-sm text-muted-foreground">Data Accuracy</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <p className="text-sm text-muted-foreground">Support Available</p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">What We Do</h2>
          
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Product Data Enrichment
              </h3>
              <p className="text-sm text-muted-foreground">
                Automatically populate missing product attributes using AI-powered 
                lookups from manufacturer databases and trusted sources.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Asset Extraction
              </h3>
              <p className="text-sm text-muted-foreground">
                Scrape product images, datasheets, and technical documents from 
                manufacturer websites with intelligent selector training.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Bulk Processing
              </h3>
              <p className="text-sm text-muted-foreground">
                Process thousands of products simultaneously with parallel execution 
                and intelligent rate limiting for maximum efficiency.
              </p>
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Who We Serve</h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Distributors</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage vast product catalogs from multiple manufacturers with 
                      consistent, accurate specifications across all SKUs.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Multi-manufacturer support
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Bulk catalog enrichment
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Manufacturers</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ensure your product data is complete and consistent across 
                      all sales channels and partner portals.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Channel syndication
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Data standardization
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">E-commerce Platforms</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Power your product search and filtering with rich, structured 
                      attribute data that improves discoverability.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Enhanced search filters
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Better product matching
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Data Teams</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Automate repetitive data entry tasks and focus on strategic 
                      initiatives that drive business value.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Time savings
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Quality assurance
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Transform Your Product Data?
            </h2>
            <p className="text-muted-foreground mb-6">
              Get started with DataEnrich today and see the difference 
              AI-powered enrichment can make for your business.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/">
                <Button variant="glow" size="lg">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>DataEnrich • Enterprise Product Specification Enrichment</p>
            <a href="mailto:support@dataenrichr.com" className="hover:text-primary transition-colors">
              support@dataenrichr.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;