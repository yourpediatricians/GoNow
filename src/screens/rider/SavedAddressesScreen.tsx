import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';
import { STORAGE_KEYS } from '../../services/api';
import { SavedAddress } from '../../types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { userService } from '../../services/user.service';
import { geocodingService } from '../../services/geocoding.service';

export const SavedAddressesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuthStore();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  
  const [label, setLabel] = useState('');
  const [addressVal, setAddressVal] = useState('');

  // Load addresses on mount
  useEffect(() => {
    if (user?.savedAddresses && user.savedAddresses.length > 0) {
      setAddresses(user.savedAddresses);
    } else {
      setAddresses([]);
    }
  }, [user]);

  const persistAddresses = async (updatedList: SavedAddress[]) => {
    try {
      // 1. Update in-memory auth store
      updateProfile({ savedAddresses: updatedList });

      // 2. Persist in AsyncStorage
      const existingUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const existingUser = existingUserStr ? JSON.parse(existingUserStr) : {};
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({ ...existingUser, savedAddresses: updatedList })
      );
      setAddresses(updatedList);

      // 3. Persist to MongoDB database via Backend API
      await userService.updateProfile({ savedAddresses: updatedList });
    } catch (err) {
      console.error('Failed to persist saved addresses:', err);
    }
  };

  const getEmojiForLabel = (lbl: string) => {
    const l = lbl.toLowerCase();
    if (l === 'home') return '🏠';
    if (l === 'office') return '💼';
    if (l === 'work') return '🏢';
    if (l === 'gym') return '💪';
    if (l === 'school' || l === 'college') return '🎓';
    return '📍';
  };

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    const hasHome = addresses.some((item) => item.label.toLowerCase() === 'home');
    setLabel(hasHome ? 'Work' : 'Home');
    setAddressVal('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setLabel(addr.label);
    setAddressVal(addr.address);
    setModalVisible(true);
  };

  const handleSaveAddress = async () => {
    const trimmedLabel = label.trim();
    const trimmedAddress = addressVal.trim();

    if (!trimmedLabel || !trimmedAddress) {
      Alert.alert('Required Fields', 'Please select a label and enter an address.');
      return;
    }

    // Check if label already exists (only when creating a new address or changing label)
    const isDuplicate = addresses.some(
      (item) =>
        item.label.toLowerCase() === trimmedLabel.toLowerCase() &&
        (!editingAddress || item.id !== editingAddress.id)
    );

    if (isDuplicate) {
      Alert.alert(
        'Duplicate Address',
        `A saved address with label "${trimmedLabel}" already exists. Please edit or delete the existing one.`
      );
      return;
    }

    // Geocode to resolve coordinates
    let lat = 28.6719; // Default (Welcome Metro Delhi)
    let lng = 77.2781;
    try {
      const coords = await geocodingService.geocode(trimmedAddress);
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      }
    } catch (err) {
      console.warn('Geocoding failed for address:', err);
    }

    let updatedList: SavedAddress[] = [];

    if (editingAddress) {
      // Edit existing
      updatedList = addresses.map((item) =>
        item.id === editingAddress.id
          ? { ...item, label: trimmedLabel, address: trimmedAddress, latitude: lat, longitude: lng }
          : item
      );
    } else {
      // Add new
      const newAddr: SavedAddress = {
        id: Date.now().toString(),
        label: trimmedLabel,
        address: trimmedAddress,
        latitude: lat,
        longitude: lng,
      };
      updatedList = [...addresses, newAddr];
    }

    await persistAddresses(updatedList);
    setModalVisible(false);
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this saved address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedList = addresses.filter((item) => item.id !== id);
            await persistAddresses(updatedList);
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Saved Addresses</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyEmoji}>📍</Text>
            <Text style={s.emptyTitle}>No saved addresses yet</Text>
            <Text style={s.emptySubtitle}>
              Save your frequent destinations like Home or Office for faster bookings.
            </Text>
          </View>
        ) : (
          <View style={s.addressList}>
            {addresses.map((item) => (
              <View key={item.id} style={s.addressCard}>
                <View style={s.addressEmojiContainer}>
                  <Text style={s.addressEmoji}>{getEmojiForLabel(item.label)}</Text>
                </View>
                <View style={s.addressDetails}>
                  <Text style={s.addressLabel}>{item.label}</Text>
                  <Text style={s.addressText} numberOfLines={2}>
                    {item.address}
                  </Text>
                </View>
                <View style={s.actionButtons}>
                  <TouchableOpacity
                    style={s.iconButton}
                    onPress={() => handleOpenEditModal(item)}
                    activeOpacity={0.7}>
                    <Text style={s.editIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.iconButton}
                    onPress={() => handleDeleteAddress(item.id)}
                    activeOpacity={0.7}>
                    <Text style={s.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add New Address Button */}
      {addresses.length < 2 && (
        <View style={s.footer}>
          <TouchableOpacity style={s.addBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.addBtnGrad}>
              <Text style={s.addBtnText}>+ Add New Address</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </Text>

            {/* Label Selector */}
            <View style={s.inputGroup}>
              <Text style={s.labelTitle}>Select Label</Text>
              <View style={s.labelSelectorRow}>
                {['Home', 'Work'].map((item) => {
                  const isSelected = label.toLowerCase() === item.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[s.labelSelectorPill, isSelected && s.labelSelectorPillActive]}
                      onPress={() => setLabel(item)}
                      activeOpacity={0.7}>
                      <Text style={[s.labelSelectorText, isSelected && s.labelSelectorTextActive]}>
                        {item === 'Home' ? '🏠 Home' : '💼 Work'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Address Field */}
            <View style={s.inputGroup}>
              <Text style={s.labelTitle}>Address Details</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Enter complete address..."
                placeholderTextColor={Colors.textMuted}
                value={addressVal}
                onChangeText={setAddressVal}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Modal Actions */}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.saveAddressBtn}
                onPress={handleSaveAddress}
                activeOpacity={0.85}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={s.saveAddressBtnGrad}>
                  <Text style={s.saveAddressBtnText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 54 : 34,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  backBtnText: {
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  addressList: {
    gap: Spacing.md,
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  addressEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  addressEmoji: {
    fontSize: 22,
  },
  addressDetails: {
    flex: 1,
  },
  addressLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  addressText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  editIcon: {
    fontSize: 12,
  },
  deleteIcon: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['5xl'],
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  addBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  addBtnGrad: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingBottom: Platform.OS === 'ios' ? 44 : Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  labelTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  quickLabelsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  labelSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  labelSelectorPill: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSelectorPillActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 90, 31, 0.08)',
  },
  labelSelectorText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  labelSelectorTextActive: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  saveAddressBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  saveAddressBtnGrad: {
    paddingVertical: Spacing.base + 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAddressBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
