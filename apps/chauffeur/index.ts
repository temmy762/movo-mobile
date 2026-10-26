/* Background tasks must be defined before the app registers, so the OS can
   wake the app for location updates while it's closed. */
import "./src/lib/location";
import "expo-router/entry";
