import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalApartment {
  id: string;
  name: string;
  description?: string;
  price?: string;
  pricePerNight?: number;
  location: string;
  imageUrl?: string;
  sourceUrl: string;
  sourceName: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
  rating?: number;
  reviewCount?: number;
  propertyType?: string;
  squareFeet?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, query } = await req.json();

    if (!location) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query for apartments
    const searchQuery = query 
      ? `${query} apartments for rent in ${location}`
      : `apartments for rent in ${location} short term rental`;

    console.log('Searching for:', searchQuery);

    // Use Firecrawl search to find apartment listings
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Search failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Search results received:', data.data?.length || 0);

    // Common amenities to look for
    const commonAmenities = [
      'wifi', 'wi-fi', 'internet', 'parking', 'pool', 'gym', 'fitness',
      'laundry', 'washer', 'dryer', 'dishwasher', 'air conditioning', 'ac', 'a/c',
      'heating', 'balcony', 'patio', 'pet friendly', 'pets allowed', 'elevator',
      'doorman', 'concierge', 'security', 'furnished', 'unfurnished',
      'hardwood', 'stainless', 'granite', 'modern', 'renovated', 'view',
      'rooftop', 'storage', 'cable', 'utilities included', 'smoke free'
    ];

    // Transform search results into apartment format
    const apartments: ExternalApartment[] = (data.data || []).map((result: any, index: number) => {
      const fullText = (result.title + ' ' + (result.description || '') + ' ' + (result.markdown || '')).toLowerCase();
      
      // Extract price from title or description
      const priceMatch = fullText.match(/\$[\d,]+(?:\s*[-–\/]\s*\$[\d,]+)?/);
      const priceStr = priceMatch ? priceMatch[0] : undefined;
      const priceNum = priceStr ? parseInt(priceStr.replace(/[$,]/g, '')) : undefined;

      // Extract bedrooms/bathrooms
      const bedroomMatch = fullText.match(/(\d+)\s*(?:bed|br|bedroom|bd)/i);
      const bathroomMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);

      // Extract rating
      const ratingMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*5|stars?|rating|⭐)/i) || 
                          fullText.match(/rating[:\s]*(\d+(?:\.\d+)?)/i);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

      // Extract review count
      const reviewMatch = fullText.match(/(\d+)\s*(?:reviews?|ratings?)/i);
      const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : undefined;

      // Extract square feet
      const sqftMatch = fullText.match(/(\d+(?:,\d+)?)\s*(?:sq\.?\s*ft\.?|square\s*feet|sqft)/i);
      const squareFeet = sqftMatch ? parseInt(sqftMatch[1].replace(',', '')) : undefined;

      // Extract property type
      let propertyType: string | undefined;
      if (fullText.includes('studio')) propertyType = 'Studio';
      else if (fullText.includes('apartment')) propertyType = 'Apartment';
      else if (fullText.includes('condo')) propertyType = 'Condo';
      else if (fullText.includes('townhouse') || fullText.includes('town house')) propertyType = 'Townhouse';
      else if (fullText.includes('house')) propertyType = 'House';
      else if (fullText.includes('loft')) propertyType = 'Loft';

      // Extract amenities
      const foundAmenities: string[] = [];
      commonAmenities.forEach(amenity => {
        if (fullText.includes(amenity)) {
          // Normalize amenity names
          let normalizedAmenity = amenity;
          if (['wifi', 'wi-fi', 'internet'].includes(amenity)) normalizedAmenity = 'WiFi';
          else if (['ac', 'a/c', 'air conditioning'].includes(amenity)) normalizedAmenity = 'A/C';
          else if (['gym', 'fitness'].includes(amenity)) normalizedAmenity = 'Gym';
          else if (['washer', 'dryer', 'laundry'].includes(amenity)) normalizedAmenity = 'Laundry';
          else if (['pet friendly', 'pets allowed'].includes(amenity)) normalizedAmenity = 'Pet Friendly';
          else normalizedAmenity = amenity.charAt(0).toUpperCase() + amenity.slice(1);
          
          if (!foundAmenities.includes(normalizedAmenity)) {
            foundAmenities.push(normalizedAmenity);
          }
        }
      });

      // Extract source name from URL
      let sourceName = 'External Listing';
      try {
        const url = new URL(result.url);
        sourceName = url.hostname.replace('www.', '').split('.')[0];
        sourceName = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
      } catch (e) {
        // Keep default
      }

      return {
        id: `ext_${Date.now()}_${index}`,
        name: result.title || 'Apartment Listing',
        description: result.description || result.markdown?.substring(0, 200),
        price: priceStr,
        pricePerNight: priceNum,
        location: location,
        imageUrl: result.image || undefined,
        sourceUrl: result.url,
        sourceName,
        bedrooms: bedroomMatch ? parseInt(bedroomMatch[1]) : undefined,
        bathrooms: bathroomMatch ? parseFloat(bathroomMatch[1]) : undefined,
        amenities: foundAmenities.slice(0, 8), // Limit to 8 amenities
        rating: rating && rating <= 5 ? rating : undefined,
        reviewCount,
        propertyType,
        squareFeet,
      };
    }).filter((apt: ExternalApartment) => apt.sourceUrl && apt.name);

    console.log('Processed apartments:', apartments.length);

    return new Response(
      JSON.stringify({ success: true, apartments }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching apartments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to search';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
