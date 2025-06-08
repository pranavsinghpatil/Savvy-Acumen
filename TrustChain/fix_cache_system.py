"""
Fix for the blockchain cache system in TrustChain

This script will patch the views.py file to fix the KeyError: 'cache_misses' issue
by updating the should_update_cache function and all other functions that rely on _blockchain_cache.

Usage:
1. Make sure your server is stopped
2. Run this script: python fix_cache_system.py
3. Restart your server

The script will create a backup of your views.py file before making changes.
"""

import os
import shutil
import re
from datetime import datetime

VIEWS_PATH = "TenderApp/views.py"
BACKUP_PATH = f"TenderApp/views_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"

def create_backup():
    """Create a backup of the views.py file"""
    print(f"Creating backup at {BACKUP_PATH}")
    shutil.copy2(VIEWS_PATH, BACKUP_PATH)

def fix_cache_system():
    """Apply fixes to the cache system"""
    print("Applying cache system fixes...")
    
    with open(VIEWS_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Step 1: Add the ensure_blockchain_cache_initialized function if it doesn't exist
    if "def ensure_blockchain_cache_initialized(" not in content:
        cache_init_function = """
# Helper function to ensure blockchain cache is properly initialized
def ensure_blockchain_cache_initialized():
    """Ensure the blockchain cache is properly initialized with all required keys"""
    global _blockchain_cache
    
    # If _blockchain_cache is None or not a dict, reinitialize it
    if not isinstance(_blockchain_cache, dict):
        _blockchain_cache = {}
    
    # Ensure all required keys exist
    required_keys = {
        'user_notifications': {}, 
        'tender_data': {}, 
        'bid_data': {},
        'last_chain_length': 0,
        'last_update': datetime.datetime.now(),
        'cache_hits': 0,
        'cache_misses': 0
    }
    
    # Add any missing keys
    for key, default_value in required_keys.items():
        if key not in _blockchain_cache:
            _blockchain_cache[key] = default_value
"""
        
        # Find a good location to insert the helper function (after cache initialization)
        cache_init_pattern = r"# Cache storage for blockchain data.+?}"
        match = re.search(cache_init_pattern, content, re.DOTALL)
        if match:
            pos = match.end() + 1
            content = content[:pos] + "\n" + cache_init_function + content[pos:]
        else:
            print("WARNING: Could not find blockchain cache initialization section")
            # Add it near the top of the file as a fallback
            import_section_end = content.find("from django.shortcuts import render") + 30
            content = content[:import_section_end] + "\n\n" + cache_init_function + content[import_section_end:]
    
    # Step 2: Update the should_update_cache function
    should_update_pattern = r"def should_update_cache\(\):.+?return needs_update"
    should_update_replacement = """def should_update_cache():
    """Determine if cache needs updating by checking blockchain length"""
    global _blockchain_cache
    
    # Make sure _blockchain_cache is properly initialized
    ensure_blockchain_cache_initialized()
    
    current_length = len(blockchain.chain)
    
    # If chain length changed or cache is older than 30 seconds, update cache
    current_time = datetime.datetime.now()
    needs_update = (
        current_length != _blockchain_cache['last_chain_length'] or
        _blockchain_cache['last_update'] is None or
        (current_time - _blockchain_cache['last_update']).total_seconds() > 30
    )
    
    if needs_update:
        _blockchain_cache['last_chain_length'] = current_length
        _blockchain_cache['last_update'] = current_time
    
    return needs_update"""
    
    content = re.sub(should_update_pattern, should_update_replacement, content, flags=re.DOTALL)
    
    # Step 3: Update the get_cached_tenders function
    get_cached_pattern = r"def get_cached_tenders.+?_blockchain_cache\['cache_misses'\] \+= 1"
    get_cached_replacement = """def get_cached_tenders(current_user):
    """Get active tenders with user bid status, using cache when possible"""
    global _blockchain_cache
    
    # Make sure _blockchain_cache is properly initialized
    ensure_blockchain_cache_initialized()
    
    cache_key = f'active_tenders_{current_user}'
    
    # Return cached data if available and recent
    if not should_update_cache() and cache_key in _blockchain_cache['tender_data']:
        _blockchain_cache['cache_hits'] += 1
        return _blockchain_cache['tender_data'][cache_key]
    
    _blockchain_cache['cache_misses'] += 1"""
    
    content = re.sub(get_cached_pattern, get_cached_replacement, content, flags=re.DOTALL)
    
    # Step 4: Update the BidTender function
    bidtender_pattern = r"def BidTender\(.+?tenders = get_cached_tenders\(current_user\)"
    bidtender_replacement = """def BidTender(request):
    """View to display active tenders for bidding with improved loading speed"""
    if request.method == 'GET':
        # Get current user from session
        current_user = get_current_user()
        
        # Make sure cache is initialized
        ensure_blockchain_cache_initialized()
            
        # Get cached tenders or fetch them if cache is invalid
        tenders = get_cached_tenders(current_user)"""
    
    content = re.sub(bidtender_pattern, bidtender_replacement, content, flags=re.DOTALL)
    
    # Step 5: Update all other functions that use _blockchain_cache
    # Find all places that access _blockchain_cache directly and add initialization
    functions_pattern = r"def ([a-zA-Z0-9_]+)\(.+?\):.+?global _blockchain_cache"
    for match in re.finditer(functions_pattern, content, flags=re.DOTALL):
        func_name = match.group(1)
        if func_name not in ["ensure_blockchain_cache_initialized", "should_update_cache", "get_cached_tenders", "BidTender"]:
            func_start = match.start()
            func_content_start = content.find("{", func_start)
            if func_content_start != -1:
                insertion_point = func_content_start + 1
                # Only add the initialization if it's not already there
                if "ensure_blockchain_cache_initialized()" not in content[func_start:func_start+500]:
                    init_code = "\n    # Make sure _blockchain_cache is properly initialized\n    ensure_blockchain_cache_initialized()\n"
                    content = content[:insertion_point] + init_code + content[insertion_point:]
    
    # Write the updated content back to the file
    with open(VIEWS_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("Cache system fixes applied successfully!")
    print("Please restart your server to apply the changes.")

if __name__ == "__main__":
    if not os.path.exists(VIEWS_PATH):
        print(f"Error: {VIEWS_PATH} not found!")
        print(f"Please run this script from the TrustChain directory.")
        exit(1)
    
    create_backup()
    fix_cache_system()
