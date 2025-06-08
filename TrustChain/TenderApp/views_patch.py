# Add this to your views.py file

def should_update_cache():
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
    
    return needs_update
