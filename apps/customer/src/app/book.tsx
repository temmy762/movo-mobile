/** Booking, opened from Home with ?service=city|care (&dropoff=…) */
import { useLocalSearchParams } from "expo-router";
import { IN_CITY_RIDES_ENABLED } from "@movo/shared";
import { CityRideBooking } from "@/components/CityRideBooking";
import { SafeRideBooking } from "@/components/SafeRideBooking";

export default function Book() {
  const { service, dropoff } = useLocalSearchParams<{ service?: string; dropoff?: string }>();
  /* With City Rides switched off, everything is a Safe Ride (as on the web) */
  return service === "care" || !IN_CITY_RIDES_ENABLED
    ? <SafeRideBooking initialDropoff={dropoff} />
    : <CityRideBooking initialDropoff={dropoff} />;
}
