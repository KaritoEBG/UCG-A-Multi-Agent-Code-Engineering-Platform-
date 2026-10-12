# Base Agent Module - Shared utilities for all agents
import os
import sys
import requests
import json
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings, key_pool

# API Configuration from settings
GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = settings.GROQ_MODEL

# Backward compatibility — callers that import GROQ_API_KEY get a rotated key
@property
def _groq_key_compat():
    return key_pool.get_key()

# Keep as a simple string for any legacy imports; agents should use key_pool.get_key()
GROQ_API_KEY = key_pool.get_key()

MAX_RETRIES = 3  # Number of retry attempts on rate-limit errors


def call_groq_api(api_key, system_prompt, user_prompt, max_tokens=2000):
    """Helper function to call Groq API with automatic key rotation on rate limits."""
    # Use provided key if valid, otherwise get a rotated key from the pool
    key = api_key if api_key and len(api_key) > 10 and ',' not in api_key else key_pool.get_key()
    
    # Check if API key is valid
    if not settings.is_valid_key(key):
        print(f"⚠️ Invalid or missing API key (length: {len(key) if key else 0})")
        return None
    
    for attempt in range(MAX_RETRIES):
        try:
            print(f"🔄 Calling Groq API with model {MODEL} (key ...{key[-8:]}, attempt {attempt + 1}/{MAX_RETRIES})...")
            response = requests.post(
                GROQ_BASE_URL,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": max_tokens
                },
                timeout=90
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                print(f"✅ API call successful (key ...{key[-8:]}), received {len(content)} chars")
                return content
            elif response.status_code == 429:
                # Rate limited — mark this key and rotate to the next one
                key_pool.mark_rate_limited(key)
                key = key_pool.get_key()
                
                # Brief pause before retrying with new key
                wait_time = min(2 ** attempt, 5)
                print(f"⏳ Rate limited. Rotating to key ...{key[-8:]}, waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ API Error: {response.status_code} - {response.text[:200]}")
                # On auth errors (401/403), blacklist the key and try another
                if response.status_code in (401, 403):
                    key_pool.mark_rate_limited(key)
                    key = key_pool.get_key()
                    continue
                return None
        except requests.exceptions.Timeout:
            print(f"❌ API Timeout after 90 seconds (key ...{key[-8:]})")
            return None
        except Exception as e:
            print(f"❌ API Error: {e}")
            return None
    
    print(f"❌ All {MAX_RETRIES} retry attempts exhausted")
    return None


class BaseAgent:
    """Base class for all AI agents"""
    
    def __init__(self, api_key=None):
        # Use provided key if valid, otherwise get a rotated key from the pool
        if api_key and len(api_key) > 10 and ',' not in api_key:
            self.api_key = api_key
        else:
            self.api_key = key_pool.get_key()
        self.name = "Base Agent"
        self.description = "Base agent class"
        print(f"🤖 {self.__class__.__name__} initialized with key ...{self.api_key[-8:] if self.api_key else 'NONE'}")
    
    def call_api(self, system_prompt, user_prompt, max_tokens=2000):
        """Call the Groq API with given prompts — uses key rotation automatically."""
        return call_groq_api(self.api_key, system_prompt, user_prompt, max_tokens)
    
    def parse_json_response(self, result):
        """Parse JSON from API response with robust error handling"""
        if result:
            try:
                # Try to find JSON in the response
                json_start = result.find('{')
                json_end = result.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    json_str = result[json_start:json_end]
                    parsed = json.loads(json_str)
                    print(f"✅ Successfully parsed JSON response")
                    return parsed
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parse error: {e}")
                # Try multiple cleanup strategies
                try:
                    # Strategy 1: Remove markdown code blocks
                    clean = result.replace('```json', '').replace('```python', '').replace('```', '')
                    json_start = clean.find('{')
                    json_end = clean.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_str = clean[json_start:json_end]
                        return json.loads(json_str)
                except:
                    pass
                
                try:
                    # Strategy 2: Fix common issues - escape control chars
                    json_str = result[result.find('{'):result.rfind('}')+1]
                    # Remove the report field if it's causing issues (we'll generate it from fixes)
                    import re
                    # Remove problematic report field
                    json_str = re.sub(r',\s*"report"\s*:\s*"[^"]*(?:\\.[^"]*)*"', '', json_str)
                    json_str = re.sub(r'"report"\s*:\s*"[^"]*(?:\\.[^"]*)*"\s*,?', '', json_str)
                    return json.loads(json_str)
                except:
                    pass
                
                try:
                    # Strategy 3: Extract key fields manually using regex
                    import re
                    extracted = {}
                    
                    # Extract status
                    status_match = re.search(r'"status"\s*:\s*"([^"]+)"', result)
                    if status_match:
                        extracted['status'] = status_match.group(1)
                    
                    # Extract fixed_code
                    code_match = re.search(r'"fixed_code"\s*:\s*"((?:[^"\\]|\\.)*)"', result, re.DOTALL)
                    if code_match:
                        extracted['fixed_code'] = code_match.group(1).encode().decode('unicode_escape')
                    
                    # Extract fixes_applied as array
                    fixes_match = re.search(r'"fixes_applied"\s*:\s*\[(.*?)\]', result, re.DOTALL)
                    if fixes_match:
                        fixes_str = fixes_match.group(1)
                        fixes = re.findall(r'"([^"]+)"', fixes_str)
                        extracted['fixes_applied'] = fixes
                    
                    # Extract issues
                    issues_match = re.search(r'"issues"\s*:\s*\[(.*?)\]', result, re.DOTALL)
                    if issues_match:
                        issues_str = issues_match.group(1)
                        issues = re.findall(r'"([^"]+)"', issues_str)
                        extracted['issues'] = issues
                    
                    if extracted.get('status') or extracted.get('fixed_code'):
                        print(f"✅ Extracted partial JSON using regex")
                        return extracted
                except Exception as e2:
                    print(f"⚠️ Regex extraction failed: {e2}")
                    pass
        return None

