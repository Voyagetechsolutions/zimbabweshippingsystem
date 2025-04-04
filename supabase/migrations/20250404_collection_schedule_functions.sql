
-- Function to get collection schedules
CREATE OR REPLACE FUNCTION public.get_collection_schedules()
RETURNS SETOF public.collection_schedules
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.collection_schedules;
$$;

-- Function to initialize collection schedules
CREATE OR REPLACE FUNCTION public.initialize_collection_schedules(schedules jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule jsonb;
BEGIN
  FOR schedule IN SELECT * FROM jsonb_array_elements(schedules)
  LOOP
    INSERT INTO public.collection_schedules (route, pickup_date, areas)
    VALUES (
      schedule->>'route',
      schedule->>'pickup_date',
      (SELECT array_agg(jsonb_array_elements_text(schedule->'areas')))
    );
  END LOOP;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to update route date
CREATE OR REPLACE FUNCTION public.update_route_date(route_name text, new_date text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.collection_schedules
  SET pickup_date = new_date
  WHERE route = route_name;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to add a new collection route
CREATE OR REPLACE FUNCTION public.add_collection_route(route_name text, pickup_date text, route_areas text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.collection_schedules (route, pickup_date, areas)
  VALUES (route_name, pickup_date, route_areas);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to remove a collection route
CREATE OR REPLACE FUNCTION public.remove_collection_route(route_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.collection_schedules
  WHERE route = route_name;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to add an area to a route
CREATE OR REPLACE FUNCTION public.add_area_to_route(route_name text, area_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.collection_schedules
  SET areas = array_append(areas, area_name)
  WHERE route = route_name
  AND NOT area_name = ANY(areas);
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to remove an area from a route
CREATE OR REPLACE FUNCTION public.remove_area_from_route(route_name text, area_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.collection_schedules
  SET areas = array_remove(areas, area_name)
  WHERE route = route_name
  AND area_name = ANY(areas);
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;
