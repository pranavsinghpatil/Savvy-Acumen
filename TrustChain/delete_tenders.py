import os
import django
import base64

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Tender.settings')
django.setup()

# Import blockchain and encryption functions
from TenderApp.views import blockchain, encrypt, decrypt

def find_all_tenders():
    """Find all tenders in the blockchain"""
    tender_titles = []
    
    for i in range(len(blockchain.chain)):
        if i > 0:
            try:
                b = blockchain.chain[i]
                data = b.transactions[0]
                data = base64.b64decode(data)
                data = str(decrypt(data))
                data = data[2:len(data)-1]
                
                arr = data.split("#")
                if arr[0] == "tender":
                    tender_titles.append(arr[1])
            except Exception as e:
                print(f"Error reading block {i}: {str(e)}")
                continue
    
    return tender_titles

def delete_specific_tenders():
    """Delete specific test tenders from the blockchain"""
    
    # List of tender titles to delete
    tender_titles = ["qwerty", "adder", "test", "tender1", "tender2", "tender3"]
    all_tenders = find_all_tenders()
    print(f"Found tenders: {', '.join(all_tenders)}")
    
    deleted_tenders = []
    
    for title in tender_titles:
        # Add a transaction marking the tender as deleted
        print(f"Deleting tender: {title}")
        data = f"delete_tender#{title}"
        data_encoded = str(base64.b64encode(encrypt(str(data))),'utf-8')
        blockchain.add_new_transaction(data_encoded)
        hash = blockchain.mine()
        
        # Save blockchain state after each deletion
        blockchain.save_object(blockchain, 'blockchain_contract.txt')
        deleted_tenders.append(title)
        
    return deleted_tenders

if __name__ == "__main__":
    deleted = delete_specific_tenders()
    print(f"\nSuccessfully deleted tenders: {', '.join(deleted)}")
    print("Blockchain has been updated.")
