import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TrustChain.settings')
django.setup()

# Import the necessary modules
from TenderApp.views import ClearTenderData_Direct

# Call the function directly
if __name__ == "__main__":
    print("Starting to clear tender data while preserving accounts...")
    result = ClearTenderData_Direct()
    if result:
        print("\nSUCCESS: Tender data cleared successfully. User accounts are preserved.")
    else:
        print("\nERROR: Failed to clear tender data.")
