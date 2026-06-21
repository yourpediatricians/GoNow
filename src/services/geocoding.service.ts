import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '../config/api.config';

export const geocodingService = {
  /**
   * Reverse-geocode latitude and longitude coordinates into a human-readable street address.
   */
  reverseGeocode: async (latitude: number, longitude: number): Promise<string> => {
    if (!GOOGLE_MAPS_API_KEY) {
      return 'Current Location (GPS)';
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await axios.get(url);
      if (response.data?.status === 'OK' && response.data.results?.[0]) {
        return response.data.results[0].formatted_address;
      }
    } catch (err) {
      console.warn('Error in reverseGeocode service:', err);
    }
    return 'Current Location (GPS)';
  }
};
