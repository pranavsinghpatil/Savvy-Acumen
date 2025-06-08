import os
import sys
import pickle
import base64
import datetime

# Add the TenderApp directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
tender_app_path = os.path.join(current_dir, 'TenderApp')
sys.path.append(tender_app_path)

# Import the blockchain class
sys.path.append(current_dir)
from Blockchain import Blockchain

# We need to provide simple implementations in case the imports fail
def dummy_decrypt(enc):
    return enc

def dummy_encrypt(plaintext):
    return plaintext

# Try to import the real functions
try:
    # This might fail if the dependencies aren't available
    import pyaes
    import pbkdf2
    
    def getKey():
        password = "s3cr3t*c0d3"
        passwordSalt = '76895'
        key = pbkdf2.PBKDF2(password, passwordSalt).read(32)
        return key
    
    def encrypt(plaintext):
        aes = pyaes.AESModeOfOperationCTR(getKey(), pyaes.Counter(31129547035000047302952433967654195398124239844566322884172163637846056248223))
        ciphertext = aes.encrypt(plaintext)
        return ciphertext
    
    def decrypt(enc):
        aes = pyaes.AESModeOfOperationCTR(getKey(), pyaes.Counter(31129547035000047302952433967654195398124239844566322884172163637846056248223))
        decrypted = aes.decrypt(enc)
        return decrypted
        
except ImportError:
    print("Warning: Could not import encryption libraries. Using dummy functions instead.")
    # Use the dummy functions if the real ones aren't available
    encrypt = dummy_encrypt
    decrypt = dummy_decrypt

def clear_tender_data():
    print("\n=== TENDER DATA CLEANUP STARTING ===")
    
    blockchain_file = os.path.join(current_dir, 'blockchain_contract.txt')
    print(f"Looking for blockchain at: {blockchain_file}")
    
    # Load the original blockchain
    original_blockchain = None
    if os.path.exists(blockchain_file):
        print("Found blockchain file, loading...")
        try:
            with open(blockchain_file, 'rb') as fileinput:
                original_blockchain = pickle.load(fileinput)
            fileinput.close()
            print(f"Successfully loaded blockchain with {len(original_blockchain.chain)} blocks")
        except Exception as e:
            print(f"ERROR loading blockchain: {str(e)}")
            return False
    else:
        print(f"No blockchain file found at {blockchain_file}")
        return False
    
    # Create a new blockchain with only the genesis block
    new_blockchain = Blockchain()
    
    # Keep track of accounts found
    accounts = []
    
    print(f"Original blockchain contains {len(original_blockchain.chain)} blocks")
    print("Scanning for account records...")
    
    # Go through each block and only keep signup records
    for i in range(len(original_blockchain.chain)):
        if i == 0:
            # This is the genesis block, already in the new blockchain
            continue
            
        try:
            b = original_blockchain.chain[i]
            data = b.transactions[0]
            data = base64.b64decode(data)
            data = str(decrypt(data))
            
            # Adjust the substring extraction based on the actual format
            if data.startswith("b'") and data.endswith("'"):
                data = data[2:len(data)-1]
            
            arr = data.split("#")
            
            if arr[0] == "signup":
                # This is a signup record, add it to the new blockchain
                username = arr[1]
                accounts.append(username)
                
                # Add this transaction to the new blockchain
                enc = encrypt(str(data))
                enc = str(base64.b64encode(enc), 'utf-8')
                new_blockchain.add_new_transaction(enc)
                hash = new_blockchain.mine()
                
                print(f"Preserved account: {username}")
        except Exception as e:
            print(f"Error processing block {i}: {str(e)}")
            continue
    
    # Save the new blockchain
    print(f"\nPreserved {len(accounts)} accounts")
    print(f"Saving new blockchain with {len(new_blockchain.chain)} blocks...")
    
    try:
        new_blockchain.save_object(new_blockchain, blockchain_file)
        print(f"New blockchain successfully saved to {blockchain_file}")
        print("\nAccounts preserved:")
        for account in accounts:
            print(f"  - {account}")
        print("\n=== TENDER DATA CLEANUP COMPLETE ===")
        return True
    except Exception as e:
        print(f"ERROR saving blockchain: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting to clear all tender data while preserving account data...")
    success = clear_tender_data()
    
    if success:
        print("\nSUCCESS: All tender data has been cleared successfully.")
    else:
        print("\nERROR: Failed to clear tender data.")
