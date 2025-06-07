from django.shortcuts import render, redirect
from django.template import RequestContext

def TenderScreen(request):
    if request.method == 'GET':
        return render(request, 'TenderScreen.html', {})

from django.contrib import messages
from django.http import HttpResponse
from django.core.files.storage import FileSystemStorage
import os
from Blockchain import *
from Block import *
from datetime import date
import pyaes, pbkdf2, binascii, os, secrets
import base64
import numpy as np
from django.shortcuts import render

blockchain = Blockchain()
if os.path.exists('blockchain_contract.txt'):
    with open('blockchain_contract.txt', 'rb') as fileinput:
        blockchain = pickle.load(fileinput)
    fileinput.close()

def getKey(): #generating key with PBKDF2 for AES
    password = "s3cr3t*c0d3"
    passwordSalt = '76895'
    key = pbkdf2.PBKDF2(password, passwordSalt).read(32)
    return key

def encrypt(plaintext): #AES data encryption
    aes = pyaes.AESModeOfOperationCTR(getKey(), pyaes.Counter(31129547035000047302952433967654195398124239844566322884172163637846056248223))
    ciphertext = aes.encrypt(plaintext)
    return ciphertext

def decrypt(enc): #AES data decryption
    aes = pyaes.AESModeOfOperationCTR(getKey(), pyaes.Counter(31129547035000047302952433967654195398124239844566322884172163637846056248223))
    decrypted = aes.decrypt(enc)
    return decrypted
        

def CreateTender(request):
    if request.method == 'GET':
       return render(request, 'CreateTender.html', {})

def OfficerOngoingTenders(request):
    from datetime import datetime
    tenders = []
    closed_tenders = []
    winner_titles = set()
    winner_info = {}
    debug_log = []
    now = datetime.now()
    debug_log.append(f"Current server time: {now}")
    
    # Collect all winner titles and their info
    for i in range(len(blockchain.chain)):
        if i > 0:
            b = blockchain.chain[i]
            data = b.transactions[0]
            data = base64.b64decode(data)
            data = str(decrypt(data))
            data = data[2:len(data)-1]
            arr = data.split("#")
            if arr[0] == "winner":
                tender_title = arr[1]
                winner_titles.add(tender_title)
                # Store bidder name and amount if available
                # Parse the winner information correctly
                if len(arr) >= 4:
                    # Format the amount properly (handle large numbers)
                    try:
                        amount = float(arr[2])
                        if amount > 1000000000:  # If over a billion
                            formatted_amount = f"{amount:.2f}".rstrip('0').rstrip('.')
                        else:
                            formatted_amount = arr[2]
                    except ValueError:
                        formatted_amount = arr[2]
                        
                    winner_info[tender_title] = {
                        'bidder': arr[3],     # Winner name is in position 3
                        'amount': formatted_amount  # Amount is in position 2, with better formatting
                    }
                else:
                    winner_info[tender_title] = {
                        'bidder': 'Selected',
                        'amount': 'Not recorded'
                    }
    debug_log.append(f"Winner titles: {winner_titles}")
    debug_log.append(f"Winner info: {winner_info}")

    # Collect ongoing tenders
    for i in range(len(blockchain.chain)):
        if i > 0:
            b = blockchain.chain[i]
            data = b.transactions[0]
            data = base64.b64decode(data)
            data = str(decrypt(data))
            data = data[2:len(data)-1]
            arr = data.split("#")
            if arr[0] == "tender":
                title = arr[1]
                description = arr[2]
                open_date = arr[3]
                close_date = arr[4]
                amount = arr[5]
                open_dt = None
                close_dt = None
                open_fmt = close_fmt = None
                for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
                    try:
                        open_dt = datetime.strptime(open_date, fmt)
                        open_fmt = fmt
                        break
                    except Exception:
                        continue
                if open_dt is None:
                    debug_log.append(f"[ERROR] Could not parse open_date: {open_date} for tender '{title}'")
                    continue
                for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
                    try:
                        close_dt = datetime.strptime(close_date, fmt)
                        close_fmt = fmt
                        break
                    except Exception:
                        continue
                if close_dt is None:
                    debug_log.append(f"[ERROR] Could not parse close_date: {close_date} for tender '{title}'")
                    continue
                # For closed or awarded tenders
                tender_data = {
                    'title': title,
                    'description': description,
                    'open_date': open_date,
                    'close_date': close_date,
                    'amount': amount
                }
                
                # Check if it's an awarded tender
                if title in winner_titles:
                    debug_log.append(f"Tender '{title}' has a winner - adding to closed tenders list.")
                    tender_data['status'] = 'Awarded'
                    tender_data['winner'] = winner_info.get(title, {}).get('bidder', 'Selected')
                    tender_data['winning_amount'] = winner_info.get(title, {}).get('amount', 'Not recorded')
                    closed_tenders.append(tender_data)
                    continue
                    
                # Check if it's a closed tender without winner
                if close_dt < now:
                    debug_log.append(f"Tender '{title}' is closed (close_date: {close_date}, parsed: {close_dt}, now: {now}).")  
                    tender_data['status'] = 'Closed'
                    closed_tenders.append(tender_data)
                    continue
                
                # Add a flag to indicate if the tender is not yet open but still viewable
                is_future = open_dt > now
                tenders.append({
                    'title': title,
                    'description': description,
                    'open_date': open_date,
                    'close_date': close_date,
                    'amount': amount,
                    'is_future': is_future
                })
                debug_log.append(f"Tender '{title}' added: open_date {open_date} ({open_fmt}), close_date {close_date} ({close_fmt}).")
    debug_log.append(f"Total ongoing tenders found: {len(tenders)}")
    debug_log.append(f"Total closed/awarded tenders found: {len(closed_tenders)}")
    context = {
        'tenders': tenders, 
        'closed_tenders': closed_tenders,
        'debug_log': debug_log
    }
    return render(request, 'OfficerOngoingTenders.html', context)


def EditTender(request, tender_title):
    # If the form is submitted (POST request), update the tender
    if request.method == 'POST':
        title = request.POST.get('title', '')
        description = request.POST.get('description', '')
        open_date = request.POST.get('open_date', '')
        close_date = request.POST.get('close_date', '')
        amount = request.POST.get('amount', '')
        
        # Delete the old tender and add a new one
        # Since blockchain can't be directly edited, we need to mark old tender as deleted
        # and add a new one with updated details
        
        # First, add a transaction marking the old tender as deleted
        data = f"delete_tender#{tender_title}"
        data_encoded = str(base64.b64encode(encrypt(str(data))),'utf-8')
        blockchain.add_new_transaction(data_encoded)
        hash = blockchain.mine()
        
        # Then, add the new updated tender
        data = f"tender#{title}#{description}#{open_date}#{close_date}#{amount}"
        data_encoded = str(base64.b64encode(encrypt(str(data))),'utf-8')
        blockchain.add_new_transaction(data_encoded)
        hash = blockchain.mine()
        
        # Redirect back to ongoing tenders page
        return redirect('OfficerOngoingTenders')
    
    # GET request - show the edit form with current tender details
    tender_data = None
    # Search for this tender in the blockchain
    for i in range(len(blockchain.chain)):
        if i > 0:
            b = blockchain.chain[i]
            data = b.transactions[0]
            data = base64.b64decode(data)
            data = str(decrypt(data))
            data = data[2:len(data)-1]
            arr = data.split("#")
            if arr[0] == "tender" and arr[1] == tender_title:
                tender_data = {
                    'title': arr[1],
                    'description': arr[2],
                    'open_date': arr[3],
                    'close_date': arr[4],
                    'amount': arr[5]
                }
                break
    
    if tender_data is None:
        # Tender not found
        return redirect('OfficerOngoingTenders')
    
    context = {'tender': tender_data}
    return render(request, 'EditTender.html', context)


def DeleteTender(request):
    # Get the title from the query parameters
    tender_title = request.GET.get('title', '')
    
    if tender_title:
        # Add a transaction marking the tender as deleted
        data = f"delete_tender#{tender_title}"
        data_encoded = str(base64.b64encode(encrypt(str(data))),'utf-8')
        blockchain.add_new_transaction(data_encoded)
        hash = blockchain.mine()
    
    # Redirect back to ongoing tenders page
    return redirect('OfficerOngoingTenders')


def index(request):
    if request.method == 'GET':
       return render(request, 'index.html', {})
    
def Logout(request):
    if request.method == 'GET':
       return render(request, 'index.html', {})        

def TenderLogin(request):
    if request.method == 'GET':
       return render(request, 'TenderLogin.html', {})

def BidderLogin(request):
    if request.method == 'GET':
       return render(request, 'BidderLogin.html', {})    
    
def Register(request):
    if request.method == 'GET':
       return render(request, 'Register.html', {})

def BidTenderAction(request):
    if request.method == 'GET':
        # Get the tender title from the query parameters
        # Remove any quotes that might be in the URL parameter
        title = request.GET.get('title', '')
        title = title.replace('"', '')
        
        # Create a properly formatted form input that works with our new form design
        output = f'<input type="text" name="t1" id="tenderTitle" class="form-control" value="{title}" readonly>'
        
        context = {
            'data1': output,
            'title': title  # Pass the raw title separately in case we need it
        }
        
        return render(request, 'BidTenderAction.html', context)
        
        
def BidTender(request):
    if request.method == 'GET':
        # Use modern table styling that works with our CSS
        output = '<table class="table table-striped">'
        output += '<thead><tr><th>Tender Title</th><th>Tender Description</th><th>Open Date</th><th>Close Date</th><th>Amount</th><th>Action</th></tr></thead><tbody>'
        
        current_date = datetime.now()
        current = int(round(current_date.timestamp()))
        found_tenders = False
        
        # For debugging - keep track of tenders and why they're filtered out
        all_tenders = 0
        filtered_tenders = 0
        
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
                        all_tenders += 1
                        # Important: Check if this tender already has a winner
                        winner_status = getWinner(arr[1])
                        
                        if winner_status == "none":
                            # Try different date formats since the form might submit in various formats
                            date_formats = ["%d-%m-%Y", "%d/%m/%Y"]
                            open_date_parsed = None
                            close_date_parsed = None
                            
                            for fmt in date_formats:
                                try:
                                    open_date_parsed = datetime.strptime(arr[3], fmt)
                                    close_date_parsed = datetime.strptime(arr[4], fmt)
                                    break
                                except ValueError:
                                    continue
                            
                            # If we couldn't parse the dates with any format, skip this tender
                            if not open_date_parsed or not close_date_parsed:
                                continue
                            
                            # REMOVED the timestamp comparison to show all available tenders
                            # We'll display all tenders that don't have a winner yet
                            found_tenders = True
                            output += f'<tr><td>{arr[1]}</td><td>{arr[2]}</td><td>{arr[3]}</td><td>{arr[4]}</td><td>{arr[5]}</td>'
                            # Improved button styling for better visibility
                            output += f'<td><a href="BidTenderAction?title={arr[1]}" class="btn btn-sm action-btn"><i class="fas fa-gavel"></i> Bid Now</a></td></tr>'
                except Exception as e:
                    # Log exception but continue processing other blocks
                    print(f"Error processing block {i}: {str(e)}")
                    pass
        
        output += '</tbody></table>'
        
        # Only set the output if tenders were found
        if not found_tenders:
            output = ''
            
        context = {
            'data': output,
            'debug_info': f"Total tenders found: {all_tenders}, Filtered: {filtered_tenders}"
        }
        return render(request, 'BidTender.html', context)


def ViewTender(request):
    if request.method == 'GET':
        # Get current user from session
        current_user = ''
        try:
            with open("session.txt", "r") as file:
                for line in file:
                    current_user = line.strip('\n')
            file.close()
        except:
            pass
            
        # Use modern table styling that works with our CSS
        output = '<table class="table table-striped">'
        output += '<thead><tr><th>Tender Title</th><th>Amount</th><th>Username</th><th>Status</th></tr></thead><tbody>'
        
        bids_found = False
        user_bids = {}
        
        # First pass: collect all biddings by the current user to avoid redundant blockchain scanning
        for i in range(len(blockchain.chain)):
            if i > 0:
                try:
                    b = blockchain.chain[i]
                    data = b.transactions[0]
                    data = base64.b64decode(data)
                    data = str(decrypt(data))
                    data = data[2:len(data)-1]
                    arr = data.split("#")
                    
                    if arr[0] == "bidding" and arr[3] == current_user:
                        bids_found = True
                        tender_title = arr[1]
                        
                        if tender_title not in user_bids:
                            user_bids[tender_title] = {
                                'amount': arr[2],
                                'status': getWinners(arr[1], arr[3])
                            }
                except Exception as e:
                    # Skip any entries with parsing issues
                    pass
        
        # Generate table rows from the collected data
        for title, bid_info in user_bids.items():
            status = bid_info['status']
            status_class = 'success' if status == 'Winner' else 'warning'
            status_icon = 'trophy' if status == 'Winner' else 'hourglass'
            
            output += f'<tr>'
            output += f'<td>{title}</td>'
            output += f'<td>{bid_info["amount"]}</td>'
            output += f'<td>{current_user}</td>'
            output += f'<td><span class="badge badge-{status_class}"><i class="fas fa-{status_icon}"></i> {status}</span></td>'
            output += f'</tr>'
        
        output += '</tbody></table>'
        
        # If no bids were found, return empty string to trigger the empty state in template
        if not bids_found:
            output = ''
            
        context = {'data': output}
        return render(request, 'ViewTender.html', context)

def getWinner(title):
    output = 'none'
    for i in range(len(blockchain.chain)):
        if i > 0:
            b = blockchain.chain[i]
            data = b.transactions[0]
            data = base64.b64decode(data)
            data = str(decrypt(data))
            data = data[2:len(data)-1]
            arr = data.split("#")
            if arr[0] == "winner" and arr[1] == title:
                output = title
                print("output",output)
                break
    return output

def getWinners(title, bidder):
    output = 'Lost'
    for i in range(len(blockchain.chain)):
        if i > 0:
            b = blockchain.chain[i]
            data = b.transactions[0]
            data = base64.b64decode(data)
            data = str(decrypt(data))
            data = data[2:len(data)-1]
            arr = data.split("#")
            if arr[0] == "winner" and arr[1] == title and arr[4] == bidder:
                output = "Winner"
                break
    return output

def EvaluateTender(request):
    if request.method == 'GET':
        # Use modern table styling that works with our CSS
        output = '<table class="table table-striped">'
        output += '<thead><tr><th>Tender Title</th><th>Highest Bid</th><th>Bidder</th><th>Action</th></tr></thead><tbody>'
        
        # Create a dictionary to store tenders and their highest bids
        # This reduces the need for multiple blockchain iterations
        tender_data = {}
        winner_data = {}
        
        # First pass - collect all relevant data
        for i in range(len(blockchain.chain)):
            if i > 0:
                try:
                    b = blockchain.chain[i]
                    data = b.transactions[0]
                    data = base64.b64decode(data)
                    data = str(decrypt(data))
                    data = data[2:len(data)-1]
                    arr = data.split("#")
                    
                    # Store winner information
                    if arr[0] == "winner":
                        winner_data[arr[1]] = arr[4]  # Store tender winner
                        
                    # Store bidding information for pending bids
                    elif arr[0] == "bidding" and arr[4] == "Pending":
                        tender_title = arr[1]
                        bid_amount = float(arr[2])
                        username = arr[3]
                        
                        # Skip tenders that already have winners
                        if tender_title in winner_data:
                            continue
                            
                        if tender_title not in tender_data:
                            tender_data[tender_title] = {
                                'highest_bid': bid_amount,
                                'highest_bidder': username
                            }
                        elif bid_amount > tender_data[tender_title]['highest_bid']:
                            tender_data[tender_title]['highest_bid'] = bid_amount
                            tender_data[tender_title]['highest_bidder'] = username
                except Exception as e:
                    # Skip any entries with parsing issues
                    continue
        
        # Generate table with evaluation options
        found_tenders = False
        for title, data in tender_data.items():
            # Skip tenders that already have winners
            if title in winner_data:
                continue
                
            found_tenders = True
            output += f'<tr>'
            output += f'<td>{title}</td>'
            output += f'<td>{data["highest_bid"]}</td>'
            output += f'<td>{data["highest_bidder"]}</td>'
            button_data = f"winner#{title}#{data['highest_bid']}#{title}#{data['highest_bidder']}"
            output += f'<td><button onclick="selectWinner(\'{button_data}\')" class="btn btn-sm btn-success action-btn"><i class="fas fa-crown"></i> Select Winner</button></td>'
            output += f'</tr>'
        
        output += '</tbody></table>'
        
        # Include JavaScript to handle winner selection
        output += '''
        <script>
        function selectWinner(winnerData) {
            if (confirm("Are you sure you want to select this bidder as the winner? This action cannot be undone.")) {
                // Create a form to submit the winner data
                var form = document.createElement("form");
                form.setAttribute("method", "post");
                form.setAttribute("action", "evaluateWinner");
                
                var csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
                var csrfInput = document.createElement("input");
                csrfInput.setAttribute("type", "hidden");
                csrfInput.setAttribute("name", "csrfmiddlewaretoken");
                csrfInput.setAttribute("value", csrfToken);
                form.appendChild(csrfInput);
                
                var hiddenField = document.createElement("input");
                hiddenField.setAttribute("type", "hidden");
                hiddenField.setAttribute("name", "winner_data");
                hiddenField.setAttribute("value", winnerData);
                form.appendChild(hiddenField);
                
                document.body.appendChild(form);
                form.submit();
            }
        }
        </script>
        '''
        
        # If no tenders found for evaluation, show empty state
        if not found_tenders:
            output = ''
        
        # Process automatic winner selection (legacy behavior)
        # This selects winners automatically without user interaction
        # We'll preserve this behavior to maintain compatibility
        for title, data in tender_data.items():
            # Skip tenders that already have winners
            if title in winner_data:
                continue
                
            # Create winner transaction
            winner_data = "winner#" + title + "#" + str(data["highest_bid"]) + "#" + title + "#" + data["highest_bidder"]
            enc = encrypt(str(winner_data))
            enc = str(base64.b64encode(enc), 'utf-8')
            blockchain.add_new_transaction(enc)
            hash = blockchain.mine()
            blockchain.save_object(blockchain, 'blockchain_contract.txt')
        
        context= {'data': output}
        return render(request, 'EvaluateTender.html', context)                                    
                    
       

def WinnerSelection(request):
    if request.method == 'GET':
        # Use modern table styling that works with our CSS
        output = '<table class="table table-striped">'
        output += '<thead><tr><th>Tender Title</th><th>Amount</th><th>Winner</th><th>Status</th></tr></thead><tbody>'
        
        # Dictionary to store winning bids
        winners = {}
        
        # First pass: collect all winner information 
        for i in range(len(blockchain.chain)):
            if i > 0:
                try:
                    b = blockchain.chain[i]
                    data = b.transactions[0]
                    data = base64.b64decode(data)
                    data = str(decrypt(data))
                    data = data[2:len(data)-1]
                    arr = data.split("#")
                    
                    # Record winner information
                    if arr[0] == "winner":
                        tender_title = arr[1]
                        bid_amount = arr[2]
                        username = arr[4]
                        
                        winners[tender_title] = {
                            'amount': bid_amount,
                            'username': username
                        }
                except Exception as e:
                    # Skip any entries with parsing issues
                    pass
        
        # Generate table with winners
        found_winners = False
        for title, data in winners.items():
            found_winners = True
            output += f'<tr>'
            output += f'<td>{title}</td>'
            output += f'<td>{data["amount"]}</td>'
            output += f'<td>{data["username"]}</td>'
            output += f'<td><span class="badge badge-success"><i class="fas fa-trophy"></i> Winner Selected</span></td>'
            output += f'</tr>'
        
        output += '</tbody></table>'
        
        # If no winners found, return empty string to trigger the empty state in template
        if not found_winners:
            output = ''
            
        context = {'data': output}
        return render(request, 'WinnerSelection.html', context)                    

def BidTenderActionPage(request):
    if request.method == 'POST':
        try:
            # Get form data
            title = request.POST.get('t1', '')
            amount = request.POST.get('t2', '')
            
            # Strip any unnecessary quotes or spaces
            title = title.strip().replace('"', '')
            amount = amount.strip()
            
            # Validate amount is a valid number
            try:
                float_amount = float(amount)
                if float_amount <= 0:
                    context = {'data': 'Invalid bid amount. Please enter a positive number.'}
                    return render(request, 'BidTenderAction.html', context)
            except ValueError:
                context = {'data': 'Invalid bid amount. Please enter a valid number.'}
                return render(request, 'BidTenderAction.html', context)
            
            # Get current user from session
            user = ''
            try:
                with open("session.txt", "r") as file:
                    for line in file:
                        user = line.strip('\n')
                        break  # Only read the first line
                    file.close()
            except Exception as e:
                context = {'data': 'Error retrieving user session. Please log in again.'}
                return render(request, 'BidTenderAction.html', context)
            
            if not user:
                context = {'data': 'User session expired. Please log in again.'}
                return render(request, 'BidTenderAction.html', context)
                
            # Create the bid data and encrypt it
            data = f"bidding#{title}#{amount}#{user}#Pending"
            
            # Add to blockchain
            try:
                enc = encrypt(str(data))
                enc = str(base64.b64encode(enc),'utf-8')
                blockchain.add_new_transaction(enc)
                hash = blockchain.mine()
                blockchain.save_object(blockchain,'blockchain_contract.txt')
                
                context = {
                    'data': f'Your bid for <strong>{title}</strong> has been successfully submitted.',
                    'success': True
                }
            except Exception as e:
                context = {'data': f'Error submitting bid: {str(e)}'}
                
            return render(request, 'BidTenderAction.html', context)
            
        except Exception as e:
            context = {'data': f'An unexpected error occurred: {str(e)}'}
            return render(request, 'BidTenderAction.html', context)

def checkUser(username):
    record = 'none'
    for i in range(len(blockchain.chain)):
        if i > 0:
            b = blockchain.chain[i]
            data = b.transactions[0]
            data = base64.b64decode(data)
            data = str(decrypt(data))
            data = data[2:len(data)-1]
            print(data)
            arr = data.split("#")
            if arr[0] == "signup":
                if arr[1] == username:
                    record = "exists"
                    break
    return record

def CreateTenderAction(request):
    if request.method == 'POST':
        title = request.POST.get('t1', False)
        description = request.POST.get('t2', False)
        open_date = request.POST.get('t3', False)
        close_date = request.POST.get('t4', False)
        amt = request.POST.get('t5', False)
        data = "tender#"+title+"#"+description+"#"+open_date+"#"+close_date+"#"+amt
        enc = encrypt(str(data))
        enc = str(base64.b64encode(enc),'utf-8')
        blockchain.add_new_transaction(enc)
        hash = blockchain.mine()
        b = blockchain.chain[len(blockchain.chain)-1]
        print("Previous Hash : "+str(b.previous_hash)+" Block No : "+str(b.index)+" Current Hash : "+str(b.hash))
        bc = "Previous Hash : "+str(b.previous_hash)+"<br/>Block No : "+str(b.index)+"<br/>Current Hash : "+str(b.hash)
        blockchain.save_object(blockchain,'blockchain_contract.txt')
        context= {'data':'Tender Created Successfully.<br/>'+bc}
        return render(request, 'CreateTender.html', context)
        

def Signup(request):
    if request.method == 'POST':
        username = request.POST.get('username', False)
        password = request.POST.get('password', False)
        contact = request.POST.get('contact', False)
        email = request.POST.get('email', False)
        cname = request.POST.get('cname', False)
        address = request.POST.get('address', False)
        check = checkUser(username)
        if check == 'none':
            data = "signup#"+username+"#"+password+"#"+contact+"#"+email+"#"+cname+"#"+address
            enc = encrypt(str(data))
            enc = str(base64.b64encode(enc),'utf-8')
            blockchain.add_new_transaction(enc)
            hash = blockchain.mine()
            b = blockchain.chain[len(blockchain.chain)-1]
            print("Previous Hash : "+str(b.previous_hash)+" Block No : "+str(b.index)+" Current Hash : "+str(b.hash))
            bc = "Previous Hash : "+str(b.previous_hash)+"<br/>Block No : "+str(b.index)+"<br/>Current Hash : "+str(b.hash)
            blockchain.save_object(blockchain,'blockchain_contract.txt')
            context= {'data':'Signup process completd and record saved in Blockchain with below hashcodes.<br/>'+bc}
            return render(request, 'Register.html', context)
        else:
            context= {'data':'Username already exists'}
            return render(request, 'Register.html', context)


def TenderLoginAction(request):
    if request.method == 'POST':
        username = request.POST.get('username', False)
        password = request.POST.get('password', False)
        if username == 'admin' and password == 'admin':
            context= {'data':'Welcome '+username}
            return render(request, 'TenderScreen.html', context)
        else:
            context= {'data':'Invalid Login'}
            return render(request, 'TenderLogin.html', context)
            


def BidderLoginAction(request):
    if request.method == 'POST':
        username = request.POST.get('username', False)
        password = request.POST.get('password', False)
        status = 'none'
        for i in range(len(blockchain.chain)):
            if i > 0:
                b = blockchain.chain[i]
                data = b.transactions[0]
                data = base64.b64decode(data)
                data = str(decrypt(data))
                data = data[2:len(data)-1]
                arr = data.split("#")
                if arr[0] == "signup":
                    if arr[1] == username and arr[2] == password:
                        status = 'success'
                        break
        if status == 'success':
            file = open('session.txt','w')
            file.write(username)
            file.close()
            context= {'data':"Welcome "+username}
            return render(request, 'BidderScreen.html', context)
        else:
            context= {'data':'Invalid login details'}
            return render(request, 'BidderLogin.html', context)
        
        

        
            
