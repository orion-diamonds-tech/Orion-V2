from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, time
from threading import Thread, Lock
import time as time_module
import pytz

app = Flask(__name__)
CORS(app) 

# ============================================
# CACHE SYSTEM
# ============================================

class GoldPriceCache:
    def __init__(self):
        self.price_24k = None
        self.last_fetch_date = None
        self.fetch_time = time(8, 0)  # 8:00 AM
        self.timezone = pytz.timezone('Asia/Kolkata')
        self.lock = Lock()
        self.error_message = None
        
    def should_fetch(self):
        """Check if we need to fetch new price"""
        now = datetime.now(self.timezone)
        
        # If never fetched, fetch now
        if self.last_fetch_date is None:
            return True
            
        # If it's a new day and past 8 AM, fetch
        if now.date() > self.last_fetch_date:
            if now.time() >= self.fetch_time:
                return True
                
        return False
    
    def get_price(self):
        """Get cached price or fetch if needed"""
        with self.lock:
            if self.should_fetch():
                self._fetch_and_cache()
            
            if self.price_24k is None:
                return None, self.error_message or "No price data available"
                
            return self.price_24k, None
    
    def _fetch_and_cache(self):
        """Internal method to fetch and cache price"""
        print(f"\n[{datetime.now(self.timezone)}] Fetching fresh gold price...")
        price, error = fetch_24k_price_surat()
        
        if error:
            print(f"❌ Error fetching price: {error}")
            self.error_message = error
            # Keep old price if fetch fails
        else:
            self.price_24k = price
            self.last_fetch_date = datetime.now(self.timezone).date()
            self.error_message = None
            print(f"✅ Price updated: ₹{price:.2f}/gram")
            print(f"   Next update: Tomorrow at 8:00 AM")
    
    def force_refresh(self):
        """Manually force a price refresh"""
        with self.lock:
            self._fetch_and_cache()

# Global cache instance
price_cache = GoldPriceCache()

# ============================================
# BACKGROUND SCHEDULER
# ============================================

def schedule_daily_fetch():
    """Background thread to check and fetch price at 8 AM daily"""
    while True:
        try:
            now = datetime.now(price_cache.timezone)
            target = datetime.combine(now.date(), price_cache.fetch_time)
            target = price_cache.timezone.localize(target)
            
            # If we missed 8 AM today, target tomorrow
            if now >= target:
                target = target.replace(day=target.day + 1)
            
            # Calculate seconds until next 8 AM
            sleep_seconds = (target - now).total_seconds()
            
            print(f"\n⏰ Next price update scheduled for: {target}")
            print(f"   Sleeping for {sleep_seconds/3600:.1f} hours...")
            
            time_module.sleep(sleep_seconds)
            
            # Fetch new price
            price_cache.get_price()
            
        except Exception as e:
            print(f"❌ Scheduler error: {e}")
            time_module.sleep(300)  # Sleep 5 min on error

# ============================================
# WEB SCRAPING
# ============================================

def fetch_24k_price_surat():
    """
    Fetch 24K gold price (per gram) from Groww Surat page
    Returns: (price, error)
    """
    url = "https://groww.in/gold-rates/gold-rate-today-in-surat"
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Look for element with ₹ inside and numeric content
        text = soup.get_text(" ", strip=True)
        matches = re.findall(r'₹\s?([\d,]+\.?\d*)', text)

        # Choose a realistic per gram gold price
        for m in matches:
            price = float(m.replace(",", ""))
            if 5000 < price < 20000:
                return price, None

        # Fallback: try to find elements with class "bodyLargeHeavy"
        spans = soup.find_all("span", class_="bodyLargeHeavy")
        for s in spans:
            txt = s.get_text(strip=True)
            if "₹" in txt or re.search(r'\d', txt):
                match = re.search(r'₹?\s?([\d,]+\.?\d*)', txt)
                if match:
                    price = float(match.group(1).replace(",", ""))
                    if 5000 < price < 20000:
                        return price, None

        return None, "Could not locate valid 24K price on Groww Surat page"

    except requests.exceptions.Timeout:
        return None, "Request timeout"
    except requests.exceptions.RequestException as e:
        return None, f"Network error: {str(e)}"
    except Exception as e:
        return None, f"Parsing error: {str(e)}"

# ============================================
# PRICE CALCULATION HELPERS
# ============================================

def calculate_all_karats(price_24k):
    """Derive all karat prices from 24K base"""
    return {
        '9K':  round(price_24k * (9/24), 2),
        '14K': round(price_24k * (14/24), 2),
        '18K': round(price_24k * (18/24), 2),
        '22K': round(price_24k * (22/24), 2), 
        '24K': round(price_24k, 2),
    }

def add_making_charges(prices, making_percent=15, include_gst=True):
    """Add making charges & GST"""
    retail = {}
    for karat, base in prices.items():
        making = base * (making_percent / 100)
        total = base + making
        if include_gst:
            total += base * 0.03 + making * 0.05
        retail[karat] = round(total, 2)
    return retail

# ============================================
# API ROUTES
# ============================================

@app.route('/')
def home():
    return jsonify({
        'name': 'Gold Price API - Surat',
        'version': '2.0 (Cached)',
        'source': 'Groww.in',
        'city': 'Surat',
        'cache_info': {
            'update_time': '8:00 AM IST daily',
            'last_update': price_cache.last_fetch_date.isoformat() if price_cache.last_fetch_date else 'Never',
            'next_update': 'Tomorrow at 8:00 AM' if price_cache.last_fetch_date else 'On first request'
        },
        'endpoints': {
            '/api/gold': 'Get all karat prices',
            '/api/gold/24k': 'Get only 24K price',
            '/api/gold/retail': 'Get retail prices with making charges',
            '/api/gold/compare': 'Compare base vs retail',
            '/api/gold/refresh': 'Manually refresh price (admin)',
            '/health': 'Check API health'
        }
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cache_status': {
            'has_price': price_cache.price_24k is not None,
            'last_fetch': price_cache.last_fetch_date.isoformat() if price_cache.last_fetch_date else None
        }
    })

@app.route('/api/gold')
def get_gold_prices():
    price_24k, error = price_cache.get_price()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    prices = calculate_all_karats(price_24k)
    return jsonify({
        'success': True,
        'city': 'Surat',
        'unit': 'INR per gram',
        'date': price_cache.last_fetch_date.isoformat(),
        'cached': True,
        'next_update': 'Tomorrow at 8:00 AM IST',
        'prices': prices
    })

@app.route('/api/gold/24k')
def get_24k_only():
    price_24k, error = price_cache.get_price()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    return jsonify({
        'success': True,
        'city': 'Surat',
        'price': round(price_24k, 2),
        'unit': 'INR per gram',
        'cached': True,
        'date': price_cache.last_fetch_date.isoformat()
    })

@app.route('/api/gold/retail')
def get_retail_prices():
    making_percent = float(request.args.get('making', 15))
    include_gst = request.args.get('gst', 'true').lower() == 'true'
    price_24k, error = price_cache.get_price()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    base = calculate_all_karats(price_24k)
    retail = add_making_charges(base, making_percent, include_gst)
    return jsonify({
        'success': True,
        'city': 'Surat',
        'making_charges': f"{making_percent}%",
        'gst_included': include_gst,
        'cached': True,
        'date': price_cache.last_fetch_date.isoformat(),
        'base_prices': base,
        'retail_prices': retail
    })

@app.route('/api/gold/compare')
def compare_prices():
    making_percent = float(request.args.get('making', 15))
    price_24k, error = price_cache.get_price()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    base = calculate_all_karats(price_24k)
    retail = add_making_charges(base, making_percent, True)
    comparison = {}
    for karat in base:
        base_p = base[karat]
        making = base_p * (making_percent / 100)
        gold_gst = base_p * 0.03
        making_gst = making * 0.05
        comparison[karat] = {
            'base': base_p,
            'making': round(making, 2),
            'gst_total': round(gold_gst + making_gst, 2),
            'final': retail[karat]
        }
    return jsonify({
        'success': True,
        'city': 'Surat',
        'cached': True,
        'date': price_cache.last_fetch_date.isoformat(),
        'comparison': comparison
    })

@app.route('/api/gold/karat/<karat>')
def get_specific_karat(karat):
    karat = karat.upper()
    if not karat.endswith('K'):
        karat += 'K'
    if karat not in ['24K', '22K', '18K', '14K', '9K']:
        return jsonify({'success': False, 'error': f'Invalid karat: {karat}'}), 400
    price_24k, error = price_cache.get_price()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    prices = calculate_all_karats(price_24k)
    return jsonify({
        'success': True,
        'city': 'Surat',
        'karat': karat,
        'price': prices[karat],
        'cached': True,
        'date': price_cache.last_fetch_date.isoformat()
    })

@app.route('/api/gold/refresh', methods=['POST'])
def refresh_price():
    """Manual refresh endpoint (for admin use)"""
    price_cache.force_refresh()
    if price_cache.price_24k:
        return jsonify({
            'success': True,
            'message': 'Price refreshed successfully',
            'price': price_cache.price_24k,
            'date': price_cache.last_fetch_date.isoformat()
        })
    else:
        return jsonify({
            'success': False,
            'error': price_cache.error_message
        }), 500

# ============================================
# RUN SERVER
# ============================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🏙️  GOLD PRICE API - Surat (Cached Edition)")
    print("="*60)
    print("📡 Running on: http://localhost:8801")
    print("⏰ Daily update: 8:00 AM IST")
    print("="*60)
    
    # Fetch initial price
    print("\n🔄 Fetching initial price...")
    price_cache.get_price()
    
    # Start background scheduler
    scheduler_thread = Thread(target=schedule_daily_fetch, daemon=True)
    scheduler_thread.start()
    print("✅ Background scheduler started")
    
    # Run Flask app
    app.run(host="0.0.0.0", port=8801, debug=False)  # debug=False to avoid duplicate scheduler