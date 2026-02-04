"""
Unit tests for rossetta-fastapi obfuscation module
"""

import pytest
import json
from rossetta_fastapi.obfuscation import (
    encode_to_google_format,
    decode_from_google_format,
    encode_response_to_google_format,
    decode_response_from_google_format,
    decode_from_form_data,
    parse_form_urlencoded,
    get_session_state,
    reset_session_state,
    get_obfuscation_headers,
)


def setup_function():
    """Reset session state before each test"""
    reset_session_state()


def test_encode_decode_google_format():
    """Test that encode and decode are inverses"""
    ciphertext = "test_ciphertext_base64_data"
    iv = "test_iv_base64_data"
    
    encoded = encode_to_google_format(ciphertext, iv)
    
    # Check that we get expected fields
    assert 'f.req' in encoded
    assert 'at' in encoded
    
    # Decode the f.req field
    decoded = decode_from_google_format(encoded['f.req'])
    
    assert decoded is not None
    assert decoded[0] == ciphertext
    assert decoded[1] == iv


def test_decode_from_form_data():
    """Test decoding from form data dict"""
    ciphertext = "encrypted_data_here"
    iv = "initialization_vector"
    
    encoded = encode_to_google_format(ciphertext, iv)
    
    # Simulate form data
    form_data = {
        'f.req': encoded['f.req'],
        'at': encoded['at'],
    }
    
    decoded = decode_from_form_data(form_data)
    
    assert decoded is not None
    assert decoded[0] == ciphertext
    assert decoded[1] == iv


def test_encode_response_to_google_format():
    """Test encoding response in Google format"""
    ciphertext = "response_ciphertext"
    iv = "response_iv"
    
    response = encode_response_to_google_format(ciphertext, iv)
    
    # Response should have multiple segments with length prefixes
    assert '\n' in response
    
    # The response format is: <len>\n<segment><len>\n<segment>...
    # Let's verify the first segment has a length prefix
    first_newline = response.find('\n')
    assert first_newline > 0
    first_length_str = response[:first_newline]
    assert first_length_str.isdigit()
    
    first_segment_len = int(first_length_str)
    first_segment_end = first_newline + 1 + first_segment_len
    first_segment = response[first_newline + 1:first_segment_end]
    
    # The first segment should be valid JSON containing wrb.fr
    json_data = json.loads(first_segment)
    assert isinstance(json_data, list)
    assert len(json_data) > 0
    assert json_data[0][0] == 'wrb.fr'
    
    # Verify we have additional segments (di, af.httprm, e)
    remaining = response[first_segment_end:]
    assert 'di' in remaining
    assert 'af.httprm' in remaining


def test_encode_decode_response_roundtrip():
    """Test that encoding and decoding responses are inverses"""
    ciphertext = "test_ciphertext_base64_encoded_data_here"
    iv = "test_iv_base64_data"
    
    # Encode the response
    encoded_response = encode_response_to_google_format(ciphertext, iv)
    
    # Verify the response has the expected structure
    assert '\n' in encoded_response
    assert 'wrb.fr' in encoded_response
    assert 'di' in encoded_response
    assert 'af.httprm' in encoded_response
    
    # Decode should recover the original data
    decoded = decode_response_from_google_format(encoded_response)
    
    assert decoded is not None
    assert decoded[0] == ciphertext
    assert decoded[1] == iv


def test_response_obfuscation_with_special_chars():
    """Test response obfuscation with characters that get unicode escaped"""
    # Base64 can contain = signs which get unicode escaped
    ciphertext = "ABC123xyz+/==="  # Typical base64 ending
    iv = "IV12345=="
    
    encoded_response = encode_response_to_google_format(ciphertext, iv)
    
    # The response should contain unicode escapes for '='
    assert '\\u003d' in encoded_response
    
    # But decoding should still work
    decoded = decode_response_from_google_format(encoded_response)
    
    assert decoded is not None
    assert decoded[0] == ciphertext
    assert decoded[1] == iv


def test_parse_form_urlencoded():
    """Test parsing URL-encoded form data"""
    # Simple case
    result = parse_form_urlencoded("key1=value1&key2=value2")
    assert result == {'key1': 'value1', 'key2': 'value2'}
    
    # URL encoded characters
    result = parse_form_urlencoded("f.req=%5B%22test%22%5D")
    assert result == {'f.req': '["test"]'}
    
    # Plus signs should be converted to spaces
    result = parse_form_urlencoded("key=value+with+spaces")
    assert result == {'key': 'value with spaces'}


def test_session_state():
    """Test session state management"""
    reset_session_state()
    
    state1 = get_session_state()
    state2 = get_session_state()
    
    # Should return the same session
    assert state1 is state2
    assert len(state1.sid) == 19
    assert state1.sid.isdigit()
    assert 'AMsTio' in state1.at
    
    # Reset and verify new session
    reset_session_state()
    state3 = get_session_state()
    
    # Should be a different session
    assert state3 is not state1


def test_session_uniqueness():
    """Test that multiple sessions have different IDs"""
    session_ids = set()
    action_tokens = set()
    
    for _ in range(10):
        reset_session_state()
        state = get_session_state()
        session_ids.add(state.sid)
        action_tokens.add(state.at)
    
    # All session IDs should be unique
    assert len(session_ids) == 10
    # All action tokens should be unique
    assert len(action_tokens) == 10


def test_increment_req_id():
    """Test request ID increment"""
    reset_session_state()
    
    state = get_session_state()
    initial_req_id = state.req_id
    
    new_req_id = state.increment_req_id()
    
    assert new_req_id > initial_req_id
    assert state.req_id == new_req_id


def test_obfuscation_headers():
    """Test Google-style response headers"""
    headers = get_obfuscation_headers()
    
    assert 'x-content-type-options' in headers
    assert headers['x-content-type-options'] == 'nosniff'
    assert 'x-frame-options' in headers
    assert 'cache-control' in headers
    assert 'content-disposition' in headers


def test_decode_invalid_format():
    """Test decoding invalid format returns None"""
    assert decode_from_google_format("not json") is None
    assert decode_from_google_format("[]") is None
    assert decode_from_google_format('{"key": "value"}') is None
    assert decode_from_google_format('[null, "not valid inner"]') is None


def test_decode_from_form_data_missing_freq():
    """Test decoding form data without f.req field"""
    form_data = {'at': 'some_token'}
    decoded = decode_from_form_data(form_data)
    assert decoded is None


def test_action_token_format():
    """Test action token contains timestamp"""
    reset_session_state()
    state = get_session_state()
    
    # Token should have format: AMsTio<random>:<timestamp>
    assert ':' in state.at
    parts = state.at.split(':')
    assert len(parts) == 2
    assert parts[1].isdigit()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
