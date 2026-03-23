import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Calendar as CalendarIcon, MapPin, Truck, Search, ArrowRight, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CollectionScheduleItem {
  id: string;
  route: string;
  pickup_date: string;
  areas: string[];
  country?: string;
}

const CollectionSchedule = () => {
  const [schedules, setSchedules] = useState<CollectionScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [allRoutes, setAllRoutes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('collection_schedules')
          .select('*')
          .order('route', { ascending: true });

        if (schedulesError) throw schedulesError;

        if (schedulesData && schedulesData.length > 0) {
          const filteredData = schedulesData.filter(schedule => schedule.route !== 'SCOTLAND ROUTE');
          setSchedules(filteredData);
          const routes = [...new Set(filteredData.map(schedule => schedule.route))];
          setAllRoutes(routes);
        } else {
          setSchedules([]);
          setAllRoutes([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load collection schedules",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = searchTerm === '' ||
      schedule.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.areas.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCountry = filterCountry === '' || filterCountry === 'all-countries' ||
      schedule.country === filterCountry;

    return matchesSearch && matchesCountry;
  });

  return (
    <>
      <Helmet>
        <title>Collection Schedule | Zimbabwe Shipping - UK Pickup Dates</title>
        <meta name="description" content="View our UK collection schedule for Zimbabwe shipping. Free pickup from anywhere in the UK. Check dates for your area." />
      </Helmet>

      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex p-4 bg-zim-green/20 rounded-full mb-4">
              <CalendarIcon className="h-8 w-8 text-zim-green" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Collection Schedule
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Free UK pickup - find when we're collecting in your area
            </p>
          </div>
        </section>

        {/* Search & Filter */}
        <section className="py-8 bg-white dark:bg-gray-900 border-b dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search by city or area..."
                    className="pl-10 h-12 dark:bg-gray-800 dark:border-gray-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger className="w-full md:w-48 h-12 dark:bg-gray-800 dark:border-gray-700">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-countries">All Countries</SelectItem>
                    <SelectItem value="England">England</SelectItem>
                    <SelectItem value="Ireland">Ireland</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Schedules */}
        <section className="py-12 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-12 w-12 border-4 border-zim-green border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No schedules found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchedules.map((schedule) => (
                  <Card key={schedule.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className={`px-5 py-4 ${
                      schedule.country === 'Ireland'
                        ? 'bg-emerald-600'
                        : 'bg-zim-green'
                    }`}>
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          <h3 className="font-bold">{schedule.route}</h3>
                        </div>
                        <Badge variant="secondary" className="bg-white/20 text-white border-0">
                          {schedule.country || 'England'}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/30 px-5 py-4 border-b dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg">
                          <CalendarIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Next Collection</p>
                          <p className="font-bold text-lg text-amber-900 dark:text-amber-200">
                            {schedule.pickup_date || 'TBC'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <MapPin className="h-4 w-4 text-zim-green" />
                        <span className="font-medium">Areas covered:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {schedule.areas.slice(0, 6).map((area) => (
                          <Badge key={area} variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                            {area}
                          </Badge>
                        ))}
                        {schedule.areas.length > 6 && (
                          <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                            +{schedule.areas.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-zim-green">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Book?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Book your collection online or call us to arrange a pickup
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book">
                <Button size="lg" className="bg-white text-zim-green hover:bg-gray-100">
                  Book Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="tel:+447584100552">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Phone className="mr-2 h-5 w-5" />
                  +44 7584 100552
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default CollectionSchedule;
