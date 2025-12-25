import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, CreditCard, Check } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type PlanTier = Database['public']['Enums']['plan_tier'];

interface Plan {
  id: string;
  name: string;
  tier: PlanTier;
  subtitle: string | null;
  price_monthly: number;
  credits_display_text: string | null;
  per_mpn_cost: string | null;
  main_feature_text: string | null;
  features: string[];
  is_active: boolean;
  monthly_credits: number;
  price_yearly: number;
  max_devices: number;
}

interface PlanFormData {
  name: string;
  tier: PlanTier;
  subtitle: string;
  price_monthly: string;
  credits_display_text: string;
  per_mpn_cost: string;
  main_feature_text: string;
  features: string;
  is_active: boolean;
}

const defaultFormData: PlanFormData = {
  name: '',
  tier: 'basic',
  subtitle: '',
  price_monthly: '0',
  credits_display_text: '',
  per_mpn_cost: '',
  main_feature_text: '',
  features: '',
  is_active: true,
};

export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      
      setPlans((data || []).map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features as string[] : [],
      })));
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenDialog = (plan?: Plan) => {
    if (plan) {
      setSelectedPlan(plan);
      setFormData({
        name: plan.name,
        tier: plan.tier,
        subtitle: plan.subtitle || '',
        price_monthly: plan.price_monthly.toString(),
        credits_display_text: plan.credits_display_text || '',
        per_mpn_cost: plan.per_mpn_cost || '',
        main_feature_text: plan.main_feature_text || '',
        features: plan.features.join('\n'),
        is_active: plan.is_active,
      });
    } else {
      setSelectedPlan(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const features = formData.features.split('\n').filter(f => f.trim());
      const priceMonthly = parseFloat(formData.price_monthly) || 0;
      
      // Extract credits from credits_display_text (e.g., "7,100 MPN included" -> 7100)
      const creditsMatch = formData.credits_display_text.replace(/,/g, '').match(/(\d+)/);
      const monthlyCredits = creditsMatch ? parseInt(creditsMatch[1]) : 0;
      
      const planData = {
        name: formData.name.trim(),
        tier: formData.tier,
        subtitle: formData.subtitle.trim() || null,
        price_monthly: priceMonthly,
        price_yearly: priceMonthly * 12, // Auto-calculate yearly
        credits_display_text: formData.credits_display_text.trim() || null,
        per_mpn_cost: formData.per_mpn_cost.trim() || null,
        main_feature_text: formData.main_feature_text.trim() || null,
        monthly_credits: monthlyCredits,
        max_devices: 3, // Default
        features: features,
        is_active: formData.is_active,
      };

      if (selectedPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', selectedPlan.id);

        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('Plan created successfully');
      }

      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', selectedPlan.id);

      if (error) throw error;
      toast.success('Plan deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan. It may be in use by users.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-500/20 text-purple-400';
      case 'pro': return 'bg-blue-500/20 text-blue-400';
      case 'basic': return 'bg-green-500/20 text-green-400';
      case 'trial': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Subscription Plans
              </CardTitle>
              <CardDescription>Manage pricing and plan features</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pricing Cards Grid - Same structure as public pricing page */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.filter(p => p.tier !== 'trial').map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${plan.tier === 'pro' ? 'border-primary shadow-lg shadow-primary/20' : ''}`}
              >
                {plan.tier === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.subtitle && (
                        <CardDescription className="mt-1">{plan.subtitle}</CardDescription>
                      )}
                    </div>
                    <Badge className={getTierColor(plan.tier)}>
                      {plan.tier}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold text-foreground">
                      ${plan.price_monthly.toLocaleString()}
                    </span>
                  </div>
                  
                  {plan.credits_display_text && (
                    <p className="text-sm font-medium text-muted-foreground">
                      {plan.credits_display_text}
                    </p>
                  )}
                  
                  {plan.per_mpn_cost && (
                    <p className="text-xs text-muted-foreground">
                      {plan.per_mpn_cost}
                    </p>
                  )}
                  
                  {plan.main_feature_text && (
                    <p className="text-sm font-medium text-primary">
                      {plan.main_feature_text}
                    </p>
                  )}
                  
                  {plan.features.length > 0 && (
                    <ul className="space-y-2 pt-2 border-t">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenDialog(plan)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Status: {plan.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trial Plans Section */}
          {plans.filter(p => p.tier === 'trial').length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Trial Plans</h3>
              <div className="grid gap-4">
                {plans.filter(p => p.tier === 'trial').map((plan) => (
                  <Card key={plan.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{plan.name}</h4>
                        <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(plan)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>
              {selectedPlan ? 'Update plan details' : 'Add a new subscription plan'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Field 1: Plan Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Professional"
              />
              <p className="text-xs text-muted-foreground">Display name like "Professional", "Enterprise"</p>
            </div>

            {/* Field 2: Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle / Tagline</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g., Best for growing businesses"
              />
              <p className="text-xs text-muted-foreground">Short description like "Best for growing businesses"</p>
            </div>

            {/* Field 3: Price */}
            <div className="space-y-2">
              <Label htmlFor="price_monthly">Price ($)</Label>
              <Input
                id="price_monthly"
                type="number"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                placeholder="e.g., 500"
              />
              <p className="text-xs text-muted-foreground">Price in USD, e.g., "500"</p>
            </div>

            {/* Field 4: Credits Display Text */}
            <div className="space-y-2">
              <Label htmlFor="credits_display_text">Credits Included Text</Label>
              <Input
                id="credits_display_text"
                value={formData.credits_display_text}
                onChange={(e) => setFormData({ ...formData, credits_display_text: e.target.value })}
                placeholder="e.g., 7,100 MPN included"
              />
              <p className="text-xs text-muted-foreground">Display text like "7,100 MPN included"</p>
            </div>

            {/* Field 5: Per MPN Cost */}
            <div className="space-y-2">
              <Label htmlFor="per_mpn_cost">Per MPN Cost Text</Label>
              <Input
                id="per_mpn_cost"
                value={formData.per_mpn_cost}
                onChange={(e) => setFormData({ ...formData, per_mpn_cost: e.target.value })}
                placeholder="e.g., ~$0.070 per MPN"
              />
              <p className="text-xs text-muted-foreground">Cost per MPN like "~$0.070 per MPN"</p>
            </div>

            {/* Field 6: Main Feature Text */}
            <div className="space-y-2">
              <Label htmlFor="main_feature_text">Main Feature Text</Label>
              <Input
                id="main_feature_text"
                value={formData.main_feature_text}
                onChange={(e) => setFormData({ ...formData, main_feature_text: e.target.value })}
                placeholder="e.g., Up to 7,100 MPN enrichments"
              />
              <p className="text-xs text-muted-foreground">Highlighted feature like "Up to 7,100 MPN enrichments"</p>
            </div>

            {/* Description Points */}
            <div className="space-y-2">
              <Label htmlFor="features">Description Points (one per line)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Enter feature points, one per line"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Bullet points shown as a checklist</p>
            </div>

            {/* Tier Selection */}
            <div className="space-y-2">
              <Label htmlFor="tier">Plan Tier</Label>
              <Select
                value={formData.tier}
                onValueChange={(value: PlanTier) => setFormData({ ...formData, tier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedPlan ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPlan?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}