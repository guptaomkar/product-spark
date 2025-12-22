import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ManufacturerTraining, SelectorMapping } from '@/types/training';
import { toast } from 'sonner';

export function useTraining() {
  const [trainings, setTrainings] = useState<ManufacturerTraining[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTraining, setCurrentTraining] = useState<ManufacturerTraining | null>(null);

  const fetchTrainings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('manufacturer_trainings')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mappedData: ManufacturerTraining[] = (data || []).map((item: any) => ({
        id: item.id,
        manufacturer: item.manufacturer,
        test_url: item.test_url,
        selectors: item.selectors as SelectorMapping[],
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      setTrainings(mappedData);
    } catch (error) {
      console.error('Error fetching trainings:', error);
      toast.error('Failed to fetch trainings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTrainingByManufacturer = useCallback(async (manufacturer: string): Promise<ManufacturerTraining | null> => {
    try {
      const { data, error } = await supabase
        .from('manufacturer_trainings')
        .select('*')
        .eq('manufacturer', manufacturer.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          id: data.id,
          manufacturer: data.manufacturer,
          test_url: data.test_url,
          selectors: (data.selectors as unknown) as SelectorMapping[],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching training:', error);
      return null;
    }
  }, []);

  const saveTraining = useCallback(async (
    manufacturer: string,
    testUrl: string,
    selectors: SelectorMapping[]
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const normalizedManufacturer = manufacturer.toLowerCase().trim();
      
      const { data: existing } = await supabase
        .from('manufacturer_trainings')
        .select('id')
        .eq('manufacturer', normalizedManufacturer)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('manufacturer_trainings')
          .update({
            test_url: testUrl,
            selectors: selectors as any,
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast.success('Training updated successfully');
      } else {
        const { error } = await supabase
          .from('manufacturer_trainings')
          .insert({
            manufacturer: normalizedManufacturer,
            test_url: testUrl,
            selectors: selectors as any,
          });

        if (error) throw error;
        toast.success('Training saved successfully');
      }

      await fetchTrainings();
      return true;
    } catch (error) {
      console.error('Error saving training:', error);
      toast.error('Failed to save training');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrainings]);

  const deleteTraining = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('manufacturer_trainings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Training deleted successfully');
      await fetchTrainings();
      return true;
    } catch (error) {
      console.error('Error deleting training:', error);
      toast.error('Failed to delete training');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrainings]);

  return {
    trainings,
    isLoading,
    currentTraining,
    setCurrentTraining,
    fetchTrainings,
    getTrainingByManufacturer,
    saveTraining,
    deleteTraining,
  };
}
