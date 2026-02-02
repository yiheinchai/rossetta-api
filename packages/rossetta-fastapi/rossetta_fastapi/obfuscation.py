"""
Google-style BatchExecute/Wrb.fr obfuscation layer
Transforms encrypted payloads into Google API-like format for enhanced obfuscation
"""

import json
import secrets
import time
import urllib.parse
from typing import Optional, Tuple, Dict, Any


class SessionState:
    """Session state for Google-style requests"""
    
    def __init__(self):
        self.sid = self._generate_session_id()
        self.req_id = secrets.randbelow(100000)
        self.at = self._generate_action_token()
    
    @staticmethod
    def _generate_session_id() -> str:
        """Generate a random session ID (f.sid format) - 19-digit numeric string"""
        return ''.join(str(secrets.randbelow(10)) for _ in range(19))
    
    @staticmethod
    def _generate_action_token() -> str:
        """Generate an action token (CSRF-like token)"""
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        result = 'AMsTio'
        result += ''.join(secrets.choice(chars) for _ in range(20))
        result += ':' + str(int(time.time() * 1000))
        return result
    
    def increment_req_id(self) -> int:
        """Increment request ID"""
        self.req_id += secrets.randbelow(1001) + 100
        return self.req_id


# Global session state
_session_state: Optional[SessionState] = None


def get_session_state() -> SessionState:
    """Initialize or get session state"""
    global _session_state
    if _session_state is None:
        _session_state = SessionState()
    return _session_state


def reset_session_state() -> None:
    """Reset session state (useful for testing)"""
    global _session_state
    _session_state = None


def decode_from_google_format(body: str) -> Optional[Tuple[str, str]]:
    """
    Decode Google BatchExecute-style format back to original encrypted data
    
    Extracts (ciphertext, iv) from the nested array structure
    """
    try:
        # URL decode if needed
        if '%5B' in body or '%5D' in body:
            body = urllib.parse.unquote(body)
        
        # Parse the outer structure
        parsed = json.loads(body)
        
        if not isinstance(parsed, list) or len(parsed) < 2:
            return None
        
        # Parse the inner wrapper string
        inner_str = parsed[1]
        inner = json.loads(inner_str)
        
        if not isinstance(inner, list) or len(inner) == 0:
            return None
        
        # Get the wrb.fr payload
        wrb_fr = inner[0]
        if not isinstance(wrb_fr, list) or len(wrb_fr) < 3 or wrb_fr[0] != 'wrb.fr':
            return None
        
        # Parse the innermost payload
        payload_str = wrb_fr[2]
        payload = json.loads(payload_str)
        
        if not isinstance(payload, list) or len(payload) < 5:
            return None
        
        # Extract ciphertext and iv from our positions
        ciphertext = payload[3]
        iv = payload[4]
        
        if not isinstance(ciphertext, str) or not isinstance(iv, str):
            return None
        
        return ciphertext, iv
    except (json.JSONDecodeError, TypeError, KeyError, IndexError):
        return None


def decode_from_form_data(form_data: Dict[str, str]) -> Optional[Tuple[str, str]]:
    """
    Decode encrypted data from form data format
    
    Extracts (ciphertext, iv) from f.req field in form data
    """
    try:
        f_req = form_data.get('f.req')
        if not f_req:
            return None
        
        return decode_from_google_format(f_req)
    except Exception:
        return None


def encode_response_to_google_format(ciphertext: str, iv: str) -> str:
    """
    Encode response in Google BatchExecute-style format
    
    Creates a response format that mimics Google's API responses
    """
    timestamp = int(time.time() * 1000)
    
    # Create the response structure
    response_payload = [
        None,
        [
            [timestamp, secrets.randbelow(1000000001), secrets.randbelow(10000000001)],
            None,
            None,
            None,
            None,
            [[2]]
        ],
        1,
        ciphertext,
        iv,
    ]
    
    # Wrap in wrb.fr format
    wrb_fr_response = [
        ['wrb.fr', None, json.dumps(response_payload)]
    ]
    
    # Add length prefix like Google does
    response_str = json.dumps(wrb_fr_response)
    length_prefix = str(len(response_str))
    
    return length_prefix + '\n' + response_str


def encode_to_google_format(ciphertext: str, iv: str) -> Dict[str, str]:
    """
    Encode encrypted data into Google BatchExecute-style format (for client use)
    
    Transforms ciphertext, iv into a nested array structure
    that mimics Google's internal API format
    """
    state = get_session_state()
    timestamp = int(time.time() * 1000)
    
    # Create nested array structure similar to Google's format
    inner_payload = [
        None,
        [
            [timestamp, secrets.randbelow(1000000001), secrets.randbelow(10000000001)],
            None,
            None,
            None,
            None,
            [[1]]
        ],
        0,
        ciphertext,
        iv,
    ]
    
    wrb_fr_payload = [
        ['wrb.fr', None, json.dumps(inner_payload)]
    ]
    
    f_req = json.dumps([
        None,
        json.dumps(wrb_fr_payload)
    ])
    
    return {
        'f.req': f_req,
        'at': state.at,
    }


def parse_form_urlencoded(body: str) -> Dict[str, str]:
    """Parse URL-encoded form data"""
    result = {}
    for pair in body.split('&'):
        if '=' in pair:
            key, value = pair.split('=', 1)
            # Use unquote_plus to handle + as space (standard form encoding)
            result[urllib.parse.unquote_plus(key)] = urllib.parse.unquote_plus(value)
    return result


def get_obfuscation_headers() -> Dict[str, str]:
    """Generate Google-style response headers"""
    return {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': '0',
        'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
        'pragma': 'no-cache',
        'content-disposition': 'attachment; filename="response.bin"; filename*=UTF-8\'\'response.bin',
    }
