import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Update this with your actual backend URL
  static const String baseUrl = 'https://osghubvtubackend.onrender.com/api'; 

  /// Initiate Payment
  /// Returns a map with 'tx_ref' and 'link'
  static Future<Map<String, dynamic>> initiatePayment(String token, double amount) async {
    final url = Uri.parse('$baseUrl/payments/initiate');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'amount': amount}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to initiate payment: ${response.body}');
    }
  }

  /// Verify Payment
  static Future<Map<String, dynamic>> verifyPayment(String token, String txRef) async {
    final url = Uri.parse('$baseUrl/payments/verify');
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'tx_ref': txRef}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to verify payment: ${response.body}');
    }
  }

  /// Get Wallet Balance
  /// Returns { "mainBalance": 0, "cashbackBalance": 0, "referralBalance": 0 }
  static Future<Map<String, dynamic>> getWalletBalance(String token) async {
    final url = Uri.parse('$baseUrl/wallet');
    final response = await http.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get balance: ${response.body}');
    }
  }
}
