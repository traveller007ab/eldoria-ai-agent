import requests
import sys

def test_proxy():
    # Try common ports
    ports = [3001, 3002, 3003, 3004, 3005, 8000]
    
    for port in ports:
        url = f"http://localhost:{port}/browser/proxy?url=https://www.example.com"
        print(f"Testing {url}...")
        try:
            response = requests.get(url, timeout=5)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Connection Successful")
                
                # Check headers
                x_frame = response.headers.get('X-Frame-Options')
                csp = response.headers.get('Content-Security-Policy')
                
                if not x_frame and not csp:
                    print("✅ Security Headers Stripped (X-Frame-Options / CSP)")
                else:
                    print(f"❌ Security Headers Present! X-Frame: {x_frame}, CSP: {csp}")
                
                # Check Content
                if "<html" in response.text.lower():
                    print("✅ HTML Content Received")
                    print(f"Preview: {response.text[:100]}...")
                else:
                    print("❌ No HTML content found")
                
                return True
            else:
                print(f"❌ Failed with status {response.status_code}")
                # print(response.text)
                
        except requests.exceptions.ConnectionError:
            print(f"⚠️ Port {port} not active")
        except Exception as e:
            print(f"❌ Error: {e}")

    print("\n❌ Could not connect to any bridge instance.")
    return False

if __name__ == "__main__":
    success = test_proxy()
    sys.exit(0 if success else 1)
