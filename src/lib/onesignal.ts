import OneSignal from "react-onesignal";

export const initializeOneSignal = async (userId?: string) => {
  try {
    await OneSignal.init({
      appId: "YOUR_ONESIGNAL_APP_ID", // Replace with your OneSignal App ID
      allowLocalhostAsSecureOrigin: true,
    });

    // Request notification permission
    const permission = await OneSignal.Notifications.requestPermission();
    
    if (permission) {
      console.log("Notification permission granted");
      
      // Set external user ID if provided
      if (userId) {
        await OneSignal.login(userId);
      }

      // Get the player ID
      const playerId = await OneSignal.User.PushSubscription.id;
      console.log("OneSignal Player ID:", playerId);
      
      return playerId;
    }
  } catch (error) {
    console.error("Error initializing OneSignal:", error);
  }
};

export const setOneSignalExternalUserId = async (userId: string) => {
  try {
    await OneSignal.login(userId);
  } catch (error) {
    console.error("Error setting OneSignal external user ID:", error);
  }
};

export const removeOneSignalExternalUserId = async () => {
  try {
    await OneSignal.logout();
  } catch (error) {
    console.error("Error removing OneSignal external user ID:", error);
  }
};
