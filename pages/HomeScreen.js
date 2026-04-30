import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Button,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AuthContext } from "../context/AuthContext";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { userData, logout } = useContext(AuthContext);

  const [permission, requestPermission] = useCameraPermissions();

  // State untuk menyimpan data hasil scan QR
  const [scannedData, setScannedData] = useState(null);

  // State untuk mengontrol scanner aktif / terkunci
  const [isScanning, setIsScanning] = useState(true);

  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // GANTI DENGAN IP LAPTOP KAMU
  const BASE_URL = "http://10.1.13.14:8080/api/presensi";

  // Jika permission masih loading
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>Memuat perizinan kamera...</Text>
      </View>
    );
  }

  // Jika user belum memberikan izin kamera
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          Aplikasi butuh akses kamera untuk memindai QR Code Presensi Dosen!
        </Text>

        <TouchableOpacity
          style={styles.buttonRequest}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Aktifkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fungsi saat QR Code terdeteksi kamera
  const handleBarCodeScanned = ({ type, data }) => {
    // Jika sedang terkunci, abaikan scan agar tidak looping
    if (!isScanning) return;

    // Kunci scanner
    setIsScanning(false);

    try {
      // Ubah teks JSON dari QR Code menjadi object JavaScript
      const qrData = JSON.parse(data);
      setScannedData(qrData);

      Alert.alert(
        "QR Code Terdeteksi",
        `Mata Kuliah: ${qrData.kodeMk}\nPertemuan: ${qrData.pertemuanKe}\nRuangan: ${qrData.ruangan}\n\nLanjutkan Presensi (Check-In)?`,
        [
          {
            text: "Batal",
            onPress: () => {
              setIsScanning(true);
              setScannedData(null);
            },
            style: "cancel",
          },
          {
            text: "Ya, Check In",
            onPress: () => handleSubmitPresensi(qrData),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "QR Tidak Valid",
        "Pastikan Anda memindai QR Code Presensi Dosen.",
      );
      setIsScanning(true);
    }
  };

  // Fungsi kirim data presensi ke API Spring Boot
  const handleSubmitPresensi = async (qrData) => {
    const now = new Date();

    const payload = {
      kodeMk: qrData.kodeMk,
      course: qrData.course || "Mobile Programming",
      nimMhs: userData?.mhsNim,
      pertemuanKe: qrData.pertemuanKe,
      date: now.toISOString().split("T")[0],
      jamPresensi: now.toLocaleTimeString("id-ID", { hour12: false }),
      status: "Present",
      ruangan: qrData.ruangan,
      dosenPengampu: qrData.dosenPengampu || "Tim Dosen TRPL",
    };

    try {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setIsCheckedIn(true);

        Alert.alert("Berhasil!", "Presensi sukses dicatat ke database.", [
          {
            text: "Lihat Riwayat",
            onPress: () => navigation.navigate("HistoryTab"),
          },
        ]);
      } else {
        Alert.alert("Gagal", result.message || "Terjadi kesalahan di server.");
      }
    } catch (error) {
      Alert.alert(
        "Error Jaringan",
        "Pastikan IP laptop benar dan API Spring Boot berjalan.",
      );
      console.log(error);
    } finally {
      // Reset agar siap scan lagi
      setIsScanning(true);
      setScannedData(null);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Overlay kotak scanner */}
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer}>
          <View style={styles.topBar}>
            <Text style={styles.userText}>
              {userData?.mhsName || "Mahasiswa"}
            </Text>

            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.focusedContainer}>
          <View style={styles.borderCornerTopLeft} />
          <View style={styles.borderCornerTopRight} />
          <View style={styles.borderCornerBottomLeft} />
          <View style={styles.borderCornerBottomRight} />
        </View>

        <View style={styles.unfocusedContainer}>
          <Text style={styles.scanText}>Arahkan Kamera ke QR Code Dosen</Text>

          {!isScanning && (
            <Button
              title="Scan Lagi"
              onPress={() => setIsScanning(true)}
              color="#ffc107"
            />
          )}

          {isCheckedIn && (
            <Text style={styles.successText}>Presensi berhasil dicatat</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  infoText: {
    color: "white",
    textAlign: "center",
    margin: 30,
    fontSize: 16,
  },

  buttonRequest: {
    backgroundColor: "#0056b3",
    padding: 15,
    borderRadius: 10,
    alignSelf: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  unfocusedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  focusedContainer: {
    width: 250,
    height: 250,
    alignSelf: "center",
    backgroundColor: "transparent",
    position: "relative",
  },

  scanText: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 5,
  },

  successText: {
    color: "#00ff99",
    fontSize: 14,
    marginTop: 15,
    fontWeight: "bold",
  },

  topBar: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  userText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 6,
  },

  logoutButton: {
    backgroundColor: "#d9534f",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  borderCornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#007bff",
  },

  borderCornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: "#007bff",
  },

  borderCornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#007bff",
  },

  borderCornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: "#007bff",
  },
});
