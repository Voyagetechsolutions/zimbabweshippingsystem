
import { supabase } from '@/integrations/supabase/client';
import { callRpcFunction } from '@/utils/supabaseUtils';
import { Driver, DriverPerformance } from '@/types/driver';

// Get driver performance data using RPC
export const getDriverPerformance = async (driverId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_driver_performance', {
      driver_id_param: driverId
    });
    
    if (error) {
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching driver performance:', error);
    return { data: null, error };
  }
};

// Update driver performance metrics
export const updateDriverPerformanceMetrics = async (driverId: string) => {
  try {
    const { data, error } = await supabase.rpc('update_driver_performance_metrics', {
      driver_id_param: driverId
    });
    
    if (error) {
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating driver performance:', error);
    return { data: null, error };
  }
};

// Get all drivers with performance data
export const getAllDriversWithPerformance = async () => {
  try {
    // Get all profiles with role = driver
    const { data: drivers, error: driversError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver');
      
    if (driversError) throw driversError;
    
    if (!drivers || drivers.length === 0) {
      return { data: [], error: null };
    }
    
    // Get performance data for each driver
    const driversWithPerformance = await Promise.all(
      drivers.map(async (driver) => {
        const { data: performanceData } = await getDriverPerformance(driver.id);
        
        // Transform the data into our Driver type
        return {
          id: driver.id,
          name: driver.full_name || 'Unknown',
          email: driver.email,
          region: performanceData?.region || 'UK',
          active: true,
          performance: performanceData ? {
            driver_id: driver.id,
            total_deliveries: performanceData.total_deliveries,
            completed_deliveries: performanceData.completed_deliveries,
            on_time_deliveries: performanceData.on_time_deliveries,
            rating: performanceData.rating,
            region: performanceData.region
          } : undefined
        };
      })
    );
    
    return { data: driversWithPerformance, error: null };
  } catch (error) {
    console.error('Error fetching all drivers with performance:', error);
    return { data: null, error };
  }
};
