import * as React from 'react';
import { Persona, PersonaSize } from '@fluentui/react/lib/Persona';
import { RiFileUploadLine, RiSendBackward ,RiSendToBack, RiFileDownloadFill , RiCloseLine} from 'react-icons/ri';
import { PrimaryButton } from '@fluentui/react';
import { Spinner, SpinnerSize } from '@fluentui/react';
import "./Chat.css";
import { IInputs } from "./generated/ManifestTypes";
import { IChatRecord } from "./types";


export interface IChatDisplayState {
    newMessage: string;
    selectedFile: File | null;
    fileName: string | '';
    fileData: string | '';
    fileTypes: string | '';
    isLoading: boolean;
    shouldScrollToBottom: boolean; // Add a flag for scrolling
}
export interface IChatDisplayProps {
    columns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
    records: IChatRecord[];
    context: ComponentFramework.Context<IInputs>;
    entityId: string | undefined;
    formEntityType: string | undefined;
    datasetEntityType: string | undefined;
    // totalMessages: number;
    hasNextPage: boolean;
    currentPage: number;
    onNextPage:() => void
    // onPreviousPage:() => void
    loadFirstPage:() => void
}

export class ChatDisplay extends React.Component<IChatDisplayProps, IChatDisplayState> {
    private containerRef: React.RefObject<HTMLDivElement>;
    private fileInputRef: React.RefObject<HTMLInputElement>;

    constructor(props: IChatDisplayProps) {
        super(props);
        this.state = {
            newMessage: '',
            selectedFile: null,
            fileName: '',
            fileData: '',
            fileTypes: '',
            isLoading: false,
            shouldScrollToBottom: true, // Add a flag for scrolling
        };
        this.containerRef = React.createRef<HTMLDivElement>();
        this.fileInputRef = React.createRef<HTMLInputElement>();
    }
    componentDidMount() {
        // Scroll to the bottom of the container after initial render
        this.scrollToBottom();
    }

    componentDidUpdate(prevProps: IChatDisplayProps) {
        if (prevProps.records !== this.props.records && this.state.shouldScrollToBottom) {
            this.scrollToBottom();
            this.setState({ shouldScrollToBottom: false });
        }
    }

    scrollToBottom = () => {
        if (this.containerRef.current) {
            this.containerRef.current.scrollTop = this.containerRef.current.scrollHeight;
        }
    };
    handleNextPage = () => {
            this.props.onNextPage();
            this.setState({ shouldScrollToBottom: false });
    };
    
    // handlePreviousPage = () => {
    //         this.props.onPreviousPage();
    // };
// Function to format date as "Today", "Yesterday", or actual date
formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';

    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
        return `Today ${messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}`;
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}`;
    } else {
      return messageDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
    }
  }

  handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ newMessage: event.target.value });
};
handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
        this.setState({ 
            selectedFile: file,
            fileName: file.name,
            fileTypes:file.type
        });
        this.readFileData(file);
    }
    // Reset the file input value
    if (this.fileInputRef.current) {
        this.fileInputRef.current.value = '';
    }
};
readFileData = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64Content = dataUrl.split(',')[1]; // Extract base64 content
        this.setState({
            fileData: base64Content,
        });
    };
    reader.readAsDataURL(file);
};

handleSendClick = async () => {
    const { newMessage, fileName, fileData ,fileTypes } = this.state;
    const { context, entityId , formEntityType, datasetEntityType ,loadFirstPage } = this.props;

    console.log("filesize",fileTypes);
    console.log("filname",fileName);
    console.log("filData",fileData);
    if (newMessage.trim() !== '' || (fileName && fileData && fileTypes)) {
        this.setState({ isLoading: true }); // Start loading
        try {
            // Fetch activity parties
            const query = `?$filter=_activityid_value eq '${entityId}' and (participationtypemask eq 1 or participationtypemask eq 2)`;
            const fetchedRecords = await context.webAPI.retrieveMultipleRecords("activityparty", query);
            // console.log("Fetched Records:", fetchedRecords);

            let fromResult: { guildId: string; entityType: string } = { guildId: '', entityType: '' };
            let toResult: { guildId: string; entityType: string } = { guildId: '', entityType: '' };

            // Function to check guildId against systemuser and account entities
            const checkGuild = async (guildId: string): Promise<{ guildId: string; entityType: string }> => {
                const entities = ['systemuser', 'account'];
                for (const entity of entities) {
                    try {
                        const fetchedRecord = await context.webAPI.retrieveRecord(entity, guildId);
                        if (fetchedRecord) {
                            return { guildId, entityType: entity };
                        }
                    } catch (error) {
                        console.error(`Error fetching from ${entity}: ${error}`);
                    }
                }
                return { guildId, entityType: '' }; // If not found, entityType will be an empty string
            };

            // Process fetchedRecords to determine fromGuild and toGuild
            fetchedRecords.entities.forEach(record => {
                if (record.participationtypemask === 1) {
                    fromResult.guildId = record._partyid_value;
                } else if (record.participationtypemask === 2) {
                    toResult.guildId = record._partyid_value;
                }
            });

            // Check From Guild
            fromResult = await checkGuild(fromResult.guildId);
            // console.log("From Guild ID:", fromResult.guildId);
            // console.log("From Guild Type:", fromResult.entityType);

            // Check To Guild
            toResult = await checkGuild(toResult.guildId);
            // console.log("To Guild ID:", toResult.guildId);
            // console.log("To Guild Type:", toResult.entityType);

            // Create new record
            const newRecord = {
                dyn_direction: 2,
                description: '',
                "dyn_sessionid_dyn_wappmessage@odata.bind": `/${formEntityType}s(${entityId})`,
                "dyn_wappmessage_activity_parties": [
                    {
                        [`partyid_${fromResult.entityType}@odata.bind`]: `/${fromResult.entityType}s(${fromResult.guildId})`,
                        participationtypemask: 1
                    },
                    {
                        [`partyid_${toResult.entityType}@odata.bind`]: `/${toResult.entityType}s(${toResult.guildId})`,
                        participationtypemask: 2
                    }
                ]
            };

            if (newMessage.trim() !== '') {
                newRecord.description = newMessage;
            }
            // Create the record and capture the response
            const createdRecord = await context.webAPI.createRecord(`${datasetEntityType}`, newRecord);
            const recordId = createdRecord.id;
            // console.log('Created record ID:', recordId);
            if(fileName && fileName && recordId){//if fileName and fileData is added and recordid is created
            //File Upload using power automate
            const input = JSON.stringify({
                "messageid": recordId,
                "fileName": fileName,
                "fileData": fileData,
                "fileType": fileTypes
            });
            try {
                const uploadUrl = `https://prod2-26.centralindia.logic.azure.com:443/workflows/9e7bd40bf3b14f6384228653f6384742/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=jcS-XMF16xa0iI-zaMK7sI54VW9qRaGty7Dwdc6ppY0`;
        
                // POST the file data
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: input
                });
        
                if (response.ok) {
                    const jsonResponse = await response.json();
                    const resMessage = jsonResponse.response;
                    console.log(resMessage);

                } else {
                    console.error('Error uploading file:', response.statusText);
                }
            } catch (error) {
                console.error('Error uploading file:', error);
            }
        } 
            // Refresh the dataset to get the latest records
            context.parameters.Whatsapp_session.refresh();
            loadFirstPage();
            // Optionally, you can perform actions after the refresh if needed
            console.log("Record created successfully and dataset refreshed.");
            // Reset newMessage state
            this.setState({ 
                newMessage: '',
                fileName: '',
                fileData: '',
                fileTypes: ''
            });
        } catch (error) {
            console.error('Error in handleSendClick:', error);
        }finally {
            this.setState({ isLoading: false,shouldScrollToBottom: true }); // Stop loading
        }
    }
};

clearFile = () => {
    this.setState({
        selectedFile: null,
        fileName: '',
        fileData: '',
        fileTypes: ''
    });
    // Reset the file input value
    if (this.fileInputRef.current) {
        this.fileInputRef.current.value = '';
    }
};
// Function to download file based on record id and file name
downloadFile = async (recordId: string, filename: string, filetype: string) => {
    const input = JSON.stringify({
        "messageid": recordId
    });
    try {
        // Construct the download URL based on your environment
        const downloadUrl = `https://prod2-15.centralindia.logic.azure.com:443/workflows/b514d482976343909f4d62d5af30046b/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=WhiP6ie8lseDiWozuJ671AOfvE3NN3nWhyTzKgIxNBY`;

        // Fetch the file data
        const response = await fetch(downloadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: input
        });

        if (response.ok) {
            // Convert response to blob
            const jsonResponse = await response.json();
            // Create URL for the blob
            const fileData = jsonResponse.file;
            const mimeType = filetype;
            // Convert Base64 string to Uint8Array
            const byteCharacters = atob(fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            // Create a Blob from the file content with the determined MIME type
            const blob = new Blob([byteArray], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            // Create a link element
            const link = document.createElement('a');
            link.href = blobUrl;
            link.target = '_blank'; // Open in a new tab
            link.download = filename; // Set the file name for download
            link.click();
        } else {
            console.error('Error downloading file:', response.statusText);
        }
    } catch (error) {
        console.error('Error downloading file:', error);
    }
};

    public render(): React.ReactNode {
        const { records, currentPage, hasNextPage} = this.props;
        const paginatedRecords = [...records].reverse(); // Use spread operator to avoid mutating props
        const { isLoading } = this.state;
        return (
            <div className='chat-container'>
                <PrimaryButton onClick={this.handleNextPage} 
                style={{ display: hasNextPage ? 'inline-block' : 'none' }}
                >Load Previous Chats</PrimaryButton>
            <div className='chat' ref={this.containerRef}>
                {paginatedRecords.length === 0 ? (
                    <div className="no-messages">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    paginatedRecords.map((record, index) => (
                        <div key={index} className={record.dyn_direction === 'Inbound' ? 'left' : 'right'}>
                            <Persona
                                className="persona"
                                initialsColor={
                                    record.dyn_direction === 'Outbound' ? '#3498db' :
                                    record.dyn_direction === 'Inbound' ? '#666666' :
                                    '#666666' // Fallback color if neither condition matches
                                }
                                size={PersonaSize.size32}
                                text={record.from ?? 'Unknown'}
                                styles={{
                                    primaryText: {
                                        color: 'black',
                                        fontWeight: 'bold'
                                    }
                                }}
                            />
                            <div className="chat-message">
                            {record.fileName && (
                                <b className='attachment'><RiFileDownloadFill onClick={() => this.downloadFile(record.id,record.fileName,record.fileType)} size={30} style={{ cursor: 'pointer'}}/> {record.fileName?? ''}</b>
                                 )}
                                 {record.fileName && <br/>}
                                <b>{record.description ?? ''}</b>
                            </div>
                            <b className="time">{this.formatDate(record.createdon) ?? ''}</b>
                        </div>
                    ))
                )}
            </div>
            {/* <PrimaryButton onClick={this.handlePreviousPage} style={{ display: currentPage === 1 ? 'none' : 'inline-block' }}>Load Next Chats</PrimaryButton> */}
            {this.state.fileName && (
                        <div className="selected-file-name">
                            {this.state.fileName}
                            <RiCloseLine className="clear-file-icon" onClick={this.clearFile} />
                        </div>
                    )}
            <div className='new-message'>
                <textarea
                    className="chat-textarea"
                    placeholder="Type your message here..."
                    value={this.state.newMessage}
                    onChange={this.handleInputChange}
                />
                <label className="upload-button">
                <RiFileUploadLine size={55} style={{ color: '#0078d4' , transition: 'color 0.3s', cursor: 'pointer'}} />
                <input type="file" onChange={this.handleFileChange} style={{ display: 'none' }} ref={this.fileInputRef}/>
                </label>
                <button onClick={this.handleSendClick} className="chat-button" disabled={isLoading}>{isLoading ? (
                            <Spinner size={SpinnerSize.medium} />
                        ) : (
                            <>Send <RiSendBackward /></>
                        )}
                        </button>
            </div>
        </div>
        );
    }
}
