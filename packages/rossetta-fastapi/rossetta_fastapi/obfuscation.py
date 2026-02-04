"""
Google-style BatchExecute/Wrb.fr obfuscation layer
Transforms encrypted payloads into Google API-like format for enhanced obfuscation

This module implements a sophisticated obfuscation scheme that mimics Google's 
BatchExecute API responses, making it harder to identify encrypted data within 
network traffic.
"""

import base64
import json
import secrets
import time
import urllib.parse
from typing import Optional, Tuple, Dict, Any, List


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


def _generate_google_id() -> str:
    """Generate a random Google-style identifier"""
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    length = secrets.randbelow(8) + 16  # 16-24 chars
    return ''.join(secrets.choice(chars) for _ in range(length))


def _generate_resource_path() -> str:
    """Generate a random Google-style resource path like /m/0_5xc"""
    hex_chars = '0123456789abcdef'
    suffix_len = secrets.randbelow(4) + 3
    suffix = ''.join(secrets.choice(hex_chars) for _ in range(suffix_len))
    return f"/m/{suffix}"


def _apply_unicode_escaping(s: str) -> str:
    """Apply selective Unicode escaping to make output look more like Google's"""
    # Replace some characters with their Unicode escape sequences
    replacements = {
        '=': '\\u003d',
        '<': '\\u003c',
        '>': '\\u003e',
        '&': '\\u0026',
    }
    result = s
    for char, escape in replacements.items():
        result = result.replace(char, escape)
    return result


# Marker prefix for scattered data identification during reassembly
DATA_SCATTER_MARKER = "RX1"


def _split_data_for_scatter(data: str, num_parts: int = 3) -> List[str]:
    """
    Split data into multiple parts for scattering across the response.
    
    The data is prefixed with DATA_SCATTER_MARKER to enable reliable reassembly.
    Parts are split roughly equally in size.
    
    Args:
        data: The data to split
        num_parts: Number of parts to split into
        
    Returns:
        List of data parts, each containing a portion of the marked data
    """
    if num_parts < 2:
        return [data]
    
    # Add a prefix marker to identify our data format during reassembly
    marked_data = f"{DATA_SCATTER_MARKER}{data}"
    
    # Calculate part sizes (roughly equal)
    total_len = len(marked_data)
    base_size = total_len // num_parts
    remainder = total_len % num_parts
    
    parts = []
    offset = 0
    for i in range(num_parts):
        # Add one extra char to first 'remainder' parts
        size = base_size + (1 if i < remainder else 0)
        parts.append(marked_data[offset:offset + size])
        offset += size
    
    return parts


def _reassemble_scattered_data(parts: List[str]) -> Optional[str]:
    """Reassemble scattered data parts by joining them and removing the marker prefix."""
    if not parts:
        return None
    
    combined = ''.join(parts)
    
    # Check for our marker prefix
    if combined.startswith(DATA_SCATTER_MARKER):
        return combined[len(DATA_SCATTER_MARKER):]  # Remove marker
    
    return None


def _safe_get_part(parts: List[str], index: int) -> Optional[str]:
    """Safely get a part from the list, returning None if index is out of bounds."""
    return parts[index] if index < len(parts) else None


def decode_from_google_format(body: str) -> Optional[Tuple[str, str]]:
    """
    Decode Google BatchExecute-style format back to original encrypted data
    
    Extracts (ciphertext, iv) from the nested array structure.
    Supports both legacy format (positions 3,4) and new scattered format.
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
    
    Creates a response format that mimics Google's API responses with:
    - Multiple segments with length prefixes
    - Various message types (di, af.httprm, e, wrb.fr)
    - Scattered encrypted data across nested structures
    - Unicode escaping
    """
    timestamp = int(time.time() * 1000)
    micro_timestamp = timestamp * 1000 + secrets.randbelow(1000)
    
    # Generate decoy identifiers that look like Google's
    resource_id = _generate_google_id()
    request_token = _generate_google_id()
    session_token = str(secrets.randbelow(10**18))  # Large numeric string
    
    # Split the ciphertext and IV for scattering across the response structure
    ct_parts = _split_data_for_scatter(ciphertext, 3)
    iv_parts = _split_data_for_scatter(iv, 2)
    
    # Apply unicode escaping to parts (mimics Google's response format)
    ct_parts_escaped = [_apply_unicode_escaping(p) for p in ct_parts]
    iv_parts_escaped = [_apply_unicode_escaping(p) for p in iv_parts]
    
    # Create deeply nested structure similar to Google Flights response
    # Structure indices (used for extraction during decoding):
    # - inner[4][0][0][1][1]: ciphertext part 1 (in resource metadata)
    # - inner[4][0][0][6][5]: IV part 1 (in multi-carrier info)
    # - inner[7]: ciphertext part 2
    # - inner[8][2]: ciphertext part 3 (in timestamp array)
    # - inner[9]: IV part 2
    inner_data = [
        # Index 0: Resource identifier header
        [
            None, 
            None, 
            2, 
            resource_id
        ],
        None,  # Index 1: Reserved
        None,  # Index 2: Reserved
        None,  # Index 3: Reserved
        # Index 4: Nested resource entries (contains ct_part[0] and iv_part[0])
        [
            [
                [
                    _generate_resource_path(),  # Resource path like /m/0_5xc
                    # Index [1]: Resource metadata array
                    [
                        [None, secrets.randbelow(10000)],
                        ct_parts_escaped[0],  # [1][1]: First ciphertext part
                    ],
                    None,
                    None,
                    None,
                    None,
                    # Index [6]: Multi-carrier/route info array
                    [
                        "multi",
                        request_token,
                        secrets.randbelow(10),
                        secrets.randbelow(10000),
                        None,
                        iv_parts_escaped[0],  # [6][5]: First IV part
                        _generate_resource_path(),
                        None,
                        0
                    ],
                    None,
                    None,
                    True,
                    1,
                    2,
                    None,
                    None,
                    secrets.randbelow(10)
                ]
            ]
        ],
        None,  # Index 5: Reserved
        None,  # Index 6: Reserved
        _safe_get_part(ct_parts_escaped, 1),  # Index 7: Second ciphertext part
        # Index 8: Timestamp and metadata array
        [
            [micro_timestamp, secrets.randbelow(100000000), secrets.randbelow(10000000000)],
            None,
            _safe_get_part(ct_parts_escaped, 2),  # [8][2]: Third ciphertext part
            None,
            None,
            [[3]]
        ],
        _safe_get_part(iv_parts_escaped, 1)  # Index 9: Second IV part
    ]
    
    # Create the wrb.fr segment
    wrb_fr_segment = [
        ["wrb.fr", None, json.dumps(inner_data)]
    ]
    wrb_fr_str = json.dumps(wrb_fr_segment)
    wrb_fr_len = len(wrb_fr_str)
    
    # Create additional segments like Google does
    di_segment = json.dumps([
        ["di", secrets.randbelow(10000)]
    ])
    di_len = len(di_segment)
    
    httprm_segment = json.dumps([
        ["af.httprm", secrets.randbelow(10000), session_token, secrets.randbelow(100)]
    ])
    httprm_len = len(httprm_segment)
    
    e_segment = json.dumps([
        ["e", secrets.randbelow(10), None, None, secrets.randbelow(10000000)]
    ])
    e_len = len(e_segment)
    
    # Combine all segments with length prefixes (Google's format)
    response = f"{wrb_fr_len}\n{wrb_fr_str}{di_len}\n{di_segment}{httprm_len}\n{httprm_segment}{e_len}\n{e_segment}"
    
    return response


def decode_response_from_google_format(body: str) -> Optional[Tuple[str, str]]:
    """
    Decode Google BatchExecute-style response to original encrypted data.
    
    Handles the sophisticated scattered format by extracting all parts
    and reassembling the ciphertext and IV.
    """
    try:
        # Parse the multi-segment response
        segments = _parse_google_segments(body)
        
        if not segments:
            return None
        
        # Find the wrb.fr segment
        wrb_fr_data = None
        for segment in segments:
            if isinstance(segment, list) and len(segment) > 0:
                if isinstance(segment[0], list) and len(segment[0]) >= 3 and segment[0][0] == 'wrb.fr':
                    wrb_fr_data = segment[0]
                    break
        
        if not wrb_fr_data:
            return None
        
        # Parse the inner payload
        inner_str = wrb_fr_data[2]
        inner = json.loads(inner_str)
        
        if not isinstance(inner, list):
            return None
        
        # Extract scattered ciphertext and IV parts from the nested structure
        # See encode_response_to_google_format() for the structure documentation
        ct_parts = []
        iv_parts = []
        
        # Ciphertext part 1: inner[4][0][0][1][1] (in resource metadata)
        try:
            ct_parts.append(_unescape_unicode(inner[4][0][0][1][1]))
        except (IndexError, TypeError):
            pass
        
        # Ciphertext part 2: inner[7] (standalone slot)
        try:
            if inner[7] is not None:
                ct_parts.append(_unescape_unicode(inner[7]))
        except (IndexError, TypeError):
            pass
        
        # Ciphertext part 3: inner[8][2] (in timestamp array)
        try:
            if inner[8] is not None and inner[8][2] is not None:
                ct_parts.append(_unescape_unicode(inner[8][2]))
        except (IndexError, TypeError):
            pass
        
        # IV part 1: inner[4][0][0][6][5] (in multi-carrier info)
        try:
            iv_parts.append(_unescape_unicode(inner[4][0][0][6][5]))
        except (IndexError, TypeError):
            pass
        
        # IV part 2: inner[9] (standalone slot)
        try:
            if inner[9] is not None:
                iv_parts.append(_unescape_unicode(inner[9]))
        except (IndexError, TypeError):
            pass
        
        # Reassemble the scattered parts back into complete data
        ciphertext = _reassemble_scattered_data(ct_parts)
        iv = _reassemble_scattered_data(iv_parts)
        
        if ciphertext is None or iv is None:
            return None
        
        return ciphertext, iv
        
    except (json.JSONDecodeError, TypeError, KeyError, IndexError):
        return None


def _parse_google_segments(body: str) -> List[Any]:
    """
    Parse Google's multi-segment response format.
    
    Format: <length>\\n<json_segment><length>\\n<json_segment>...
    """
    segments = []
    remaining = body.strip()
    
    while remaining:
        # Find the length prefix
        newline_idx = remaining.find('\n')
        if newline_idx == -1:
            break
        
        length_str = remaining[:newline_idx]
        if not length_str.isdigit():
            break
        
        segment_length = int(length_str)
        segment_start = newline_idx + 1
        segment_end = segment_start + segment_length
        
        if segment_end > len(remaining):
            # Partial segment - try to parse what we have
            segment_str = remaining[segment_start:]
        else:
            segment_str = remaining[segment_start:segment_end]
        
        try:
            segment = json.loads(segment_str)
            segments.append(segment)
        except json.JSONDecodeError:
            pass
        
        remaining = remaining[segment_end:] if segment_end <= len(remaining) else ""
    
    return segments


def _unescape_unicode(s: str) -> str:
    """Reverse Unicode escaping"""
    if not isinstance(s, str):
        return s
    
    replacements = {
        '\\u003d': '=',
        '\\u003c': '<',
        '\\u003e': '>',
        '\\u0026': '&',
    }
    result = s
    for escape, char in replacements.items():
        result = result.replace(escape, char)
    return result


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
