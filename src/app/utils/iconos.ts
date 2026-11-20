import { addIcons } from 'ionicons';
import {
  add,
  barbellOutline,
  calendarOutline,
  cameraOutline,
  chevronForward,
  cloudUploadOutline,
  createOutline,
  documentTextOutline,
  downloadOutline,
  imageOutline,
  locationOutline,
  medkitOutline,
  notificationsOutline,
  paw,
  pulseOutline,
  shieldCheckmarkOutline,
  trashOutline,
  trendingDownOutline,
  trendingUpOutline,
  flaskOutline,
} from 'ionicons/icons';

/** Registra una sola vez todos los íconos de Ionicons que usa la app. */
export function registrarIconos(): void {
  addIcons({
    add,
    'barbell-outline': barbellOutline,
    'calendar-outline': calendarOutline,
    'camera-outline': cameraOutline,
    'chevron-forward': chevronForward,
    'cloud-upload-outline': cloudUploadOutline,
    'create-outline': createOutline,
    'document-text-outline': documentTextOutline,
    'download-outline': downloadOutline,
    'flask-outline': flaskOutline,
    'image-outline': imageOutline,
    'location-outline': locationOutline,
    'medkit-outline': medkitOutline,
    'notifications-outline': notificationsOutline,
    paw,
    'pulse-outline': pulseOutline,
    'shield-checkmark-outline': shieldCheckmarkOutline,
    'trash-outline': trashOutline,
    'trending-down-outline': trendingDownOutline,
    'trending-up-outline': trendingUpOutline,
  });
}
