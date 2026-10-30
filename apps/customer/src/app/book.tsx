/**
 * Booking, opened from Home with ?service=city|care (&dropoff=…).
 * City Rides books in the app; Safe Ride's 4-step flow is the next build
 * step — until then it opens the web booking.
 */
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Button, fonts } from "@movo/ui";
import { CityRideBooking } from "@/components/CityRideBooking";
import { ScreenHeader } from "@/components/ScreenHeader";
import { openWeb } from "@/lib/links";

export default function Book() {
  const { service, dropoff } = useLocalSearchParams<{ service?: string; dropoff?: string }>();

  if (service !== "care") return <CityRideBooking initialDropoff={dropoff} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F2" }}>
      <ScreenHeader title="Book a Safe Ride" />
      <View style={styles.page}>
        <Text style={styles.body}>
          Safe Ride booking is coming to the app shortly. For now, book your Safe Ride on movoprive.com — sign in there with the same email and password.
        </Text>
        <Button title="Book on movoprive.com" onPress={() => openWeb("/home/pickup?service=care&tier=black")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  body: { fontFamily: fonts.body, fontSize: 14, color: "#4b5563", lineHeight: 20 },
});
