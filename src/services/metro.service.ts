import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '../config/api.config';

export interface MetroStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  lineColor?: string; // e.g. Red, Pink, Blue, Yellow
  distanceKm?: number;
  formattedDistance?: string;
  icon?: string;
  isGoogle?: boolean;
}

// Master list of Metro Stations across Delhi NCR and major urban hubs
const METRO_STATIONS_DATABASE: Omit<MetroStation, 'distanceKm' | 'formattedDistance'>[] = [
  { id: 'm1', name: 'Dilshad Garden Metro', address: 'GT Road, Dilshad Garden, Delhi', latitude: 28.6759, longitude: 77.3216, lineColor: '#EF4444', icon: '🚇' },
  { id: 'm2', name: 'Maujpur-Babarpur Metro', address: 'Maujpur Main Road, Delhi', latitude: 28.6885, longitude: 77.2764, lineColor: '#EC4899', icon: '🚇' },
  { id: 'm3', name: 'Shahdara Metro Station', address: 'GT Road, Shahdara, Delhi', latitude: 28.6733, longitude: 77.2897, lineColor: '#EF4444', icon: '🚇' },
  { id: 'm4', name: 'Welcome Metro Station', address: 'Welcome, Shahdara, Delhi', latitude: 28.6719, longitude: 77.2781, lineColor: '#EF4444', icon: '🚇' },
  { id: 'm5', name: 'Seelampur Metro', address: 'GT Road, Seelampur, Delhi', latitude: 28.6639, longitude: 77.2678, lineColor: '#EF4444', icon: '🚇' },
  { id: 'm6', name: 'Gokulpuri Metro', address: 'Wazirabad Road, Gokulpuri, Delhi', latitude: 28.7032, longitude: 77.2798, lineColor: '#EC4899', icon: '🚇' },
  { id: 'm7', name: 'Mansarovar Park Metro', address: 'Mansarovar Park, Shahdara, Delhi', latitude: 28.6750, longitude: 77.3021, lineColor: '#EF4444', icon: '🚇' },
  { id: 'm8', name: 'Jhilmil Metro Station', address: 'Jhilmil Colony, Delhi', latitude: 28.6757, longitude: 77.3123, lineColor: '#EF4444', icon: '🚇' },
  { id: 'm9', name: 'Kashmere Gate Metro', address: 'Kashmere Gate, Old Delhi', latitude: 28.6675, longitude: 77.2285, lineColor: '#EF4444', icon: '🚇' },
  { id: 'm10', name: 'Rajiv Chowk Metro', address: 'Connaught Place, Central Delhi', latitude: 28.6328, longitude: 77.2197, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm11', name: 'Anand Vihar ISBT Metro', address: 'Anand Vihar, Delhi', latitude: 28.6469, longitude: 77.3160, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm12', name: 'Preet Vihar Metro', address: 'Vikas Marg, Preet Vihar, Delhi', latitude: 28.6436, longitude: 77.2963, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm13', name: 'Nirman Vihar Metro', address: 'Vikas Marg, Nirman Vihar, Delhi', latitude: 28.6375, longitude: 77.2784, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm14', name: 'Laxmi Nagar Metro', address: 'Vikas Marg, Laxmi Nagar, Delhi', latitude: 28.6305, longitude: 77.2773, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm15', name: 'Akshardham Metro', address: 'Noida Link Road, Delhi', latitude: 28.6181, longitude: 77.2782, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm16', name: 'Mayur Vihar Phase-1 Metro', address: 'Mayur Vihar, Delhi', latitude: 28.6041, longitude: 77.2946, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm17', name: 'NOIDA Sector 18 Metro', address: 'Sector 18, Noida, Uttar Pradesh', latitude: 28.5708, longitude: 77.3261, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm18', name: 'Botanical Garden Metro', address: 'Sector 37, Noida, Uttar Pradesh', latitude: 28.5644, longitude: 77.3342, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm19', name: 'Hauz Khas Metro', address: 'Outer Ring Road, Hauz Khas, Delhi', latitude: 28.5434, longitude: 77.2064, lineColor: '#EAB308', icon: '🚇' },
  { id: 'm20', name: 'Iffco Chowk Metro', address: 'NH 48, Sector 29, Gurugram', latitude: 28.4721, longitude: 77.0725, lineColor: '#EAB308', icon: '🚇' },
  { id: 'm21', name: 'Cyber City Metro', address: 'DLF Cyber City, Gurugram', latitude: 28.4947, longitude: 77.0886, lineColor: '#EC4899', icon: '🚇' },
  { id: 'm22', name: 'Dwarka Sector 21 Metro', address: 'Sector 21, Dwarka, Delhi', latitude: 28.5524, longitude: 77.0583, lineColor: '#3B82F6', icon: '🚇' },
  { id: 'm23', name: 'AIIMS Metro Station', address: 'Sri Aurobindo Marg, Ansari Nagar, Delhi', latitude: 28.5689, longitude: 77.2078, lineColor: '#EAB308', icon: '🚇' },
  { id: 'm24', name: 'Chandni Chowk Metro', address: 'Chandni Chowk, Old Delhi', latitude: 28.6578, longitude: 77.2301, lineColor: '#EAB308', icon: '🚇' },
  { id: 'm25', name: 'New Delhi Metro', address: 'Bhavbhuti Marg, New Delhi', latitude: 28.6428, longitude: 77.2223, lineColor: '#EAB308', icon: '🚇' },
];

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in kilometers to human-readable string (e.g. "450 m away" or "1.2 km away")
 */
export function formatDistanceString(distKm: number): string {
  if (distKm < 1) {
    const meters = Math.round(distKm * 1000);
    return `${meters} m away`;
  }
  return `${distKm.toFixed(1)} km away`;
}

export const metroService = {
  /**
   * Get nearest Metro stations sorted by proximity to the user's current GPS location.
   */
  getNearestMetroStations: (
    userLat: number,
    userLng: number,
    queryText: string = '',
    limit: number = 10
  ): MetroStation[] => {
    // 1. Filter by query if user is typing
    let filtered = METRO_STATIONS_DATABASE;
    if (queryText.trim().length > 0) {
      const q = queryText.trim().toLowerCase();
      filtered = METRO_STATIONS_DATABASE.filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          st.address.toLowerCase().includes(q)
      );
    }

    // 2. Compute distance for each station and format
    const withDistance: MetroStation[] = filtered.map((st) => {
      const dist = calculateDistanceKm(userLat, userLng, st.latitude, st.longitude);
      return {
        ...st,
        distanceKm: dist,
        formattedDistance: formatDistanceString(dist),
        icon: '🚇',
      };
    });

    // 3. Sort ascending by distance (nearest metro first, then next closest, etc.)
    withDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    return withDistance.slice(0, limit);
  },

  /**
   * Search Google Places Nearby API for Metro Stations around the user's coordinates.
   * Falls back to local sorted database.
   */
  fetchNearbyMetroFromGoogle: async (
    userLat: number,
    userLng: number
  ): Promise<MetroStation[]> => {
    // Always calculate local sorted list first
    const localSorted = metroService.getNearestMetroStations(userLat, userLng);

    if (!GOOGLE_MAPS_API_KEY) {
      return localSorted;
    }

    try {
      // Search for subway/metro station places nearby (5km radius)
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLat},${userLng}&radius=5000&type=subway_station&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);

      if (response.data?.status === 'OK' && response.data.results?.length > 0) {
        const googleStations: MetroStation[] = response.data.results.map(
          (p: any) => {
            const lat = p.geometry.location.lat;
            const lng = p.geometry.location.lng;
            const dist = calculateDistanceKm(userLat, userLng, lat, lng);
            return {
              id: p.place_id,
              name: p.name,
              address: p.vicinity || p.formatted_address || 'Metro Station',
              latitude: lat,
              longitude: lng,
              distanceKm: dist,
              formattedDistance: formatDistanceString(dist),
              icon: '🚇',
              isGoogle: true,
            };
          }
        );

        googleStations.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
        return googleStations;
      }
    } catch (err) {
      console.warn('Error fetching nearby metro from Google Places API:', err);
    }

    return localSorted;
  },
};
