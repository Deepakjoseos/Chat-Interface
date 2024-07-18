import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { ChatDisplay, IChatDisplayProps } from "./ChatDisplay";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { IChatRecord } from "./types";

interface IMode {
    contextInfo: {
        entityId: string;
        entityTypeName:string
        // other properties as needed
    };
}

export class ChatControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;
    // private context: ComponentFramework.Context<IInputs>;
    private entityId: string = '';
    private entityType: string = '';
    private datasetEntityType: string = ''
    private currentPage: number = 1; // Current page number
    private context: ComponentFramework.Context<IInputs>;
    private cumulativeRecords: IChatRecord[] = []; // Cumulative list of records
    
    constructor() {    //Methods onNextPage, onPreviousPage, and loadFirstPage are bound to this in the constructor.
        this.onNextPage = this.onNextPage.bind(this);
        // this.onPreviousPage = this.onPreviousPage.bind(this);
        this.loadFirstPage = this.loadFirstPage.bind(this);
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.container = container;

        const modeUnknown = context.mode as unknown;
        const entityId = (modeUnknown as IMode)?.contextInfo?.entityId;
        const entityType = (modeUnknown as IMode)?.contextInfo?.entityTypeName;

        if (entityId && entityType) {
            this.entityId = entityId;
            this.entityType = entityType
            // console.log("Entity ID retrieved:", this.entityId,"entity Type is :",entityType);
        } else {
            console.warn("Entity ID not found in contextInfo.");
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        this.renderControl(context); // Update rendering on context change
    }

    private onNextPage = async (): Promise<void> => {
        try {
            if (this.context.parameters.Whatsapp_session.paging.hasNextPage) {
                const nextPage = this.currentPage + 1;
                this.context.parameters.Whatsapp_session.paging.loadExactPage(nextPage);
                this.currentPage = nextPage; // Update currentPage after loading
                this.renderControl(this.context);
            }
        } catch (error) {
            console.error('Error in onNextPage:', error);
        }
    };

    // private onPreviousPage = (): void => {
    //     try{
    // if (this.context.parameters.Whatsapp_session.paging.hasPreviousPage) {
    //     const previousPage = this.currentPage - 1;
    //     this.context.parameters.Whatsapp_session.paging.loadExactPage(previousPage);
    //     this.currentPage = previousPage; // Update currentPage after loading
    //     this.renderControl(this.context);
    // }
    //     }catch (error) {
	// 		console.log('Error in onPreviousPage:' + error);
	// 	}
    // };

    private loadFirstPage = async (): Promise<void> => {
        try {
            this.context.parameters.Whatsapp_session.paging.reset();
            this.currentPage = 1;
            this.cumulativeRecords = []; // Clear cumulative records on first page load
            this.renderControl(this.context);
        } catch (error) {
            console.error('loadFirstPage', error);
        }
    };
//Adding Pagination and Fetching Records including attachments
private getFileTypeFromFileName(fileName: string): string {
    // Extract file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Determine file type based on extension
    switch (fileExtension) {
        case 'pdf':
            return 'application/pdf';
        case 'doc':
        case 'docx':
            return 'application/msword';
        case 'xls':
        case 'xlsx':
            return 'application/vnd.ms-excel';
        case 'ppt':
        case 'pptx':
            return 'application/vnd.ms-powerpoint';
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'gif':
            return 'image/gif';
        case 'bmp':
            return 'image/bmp';
        case 'tiff':
            return 'image/tiff';
        case 'webp':
            return 'image/webp';
        case 'svg':
            return 'image/svg+xml';
        // Add more cases for other file types as needed
        default:
            return 'application/octet-stream'; // Default to generic binary type
    }
}


private fetchRecords = async (): Promise<IChatRecord[]> => {
    const dataset1 = this.context.parameters.Whatsapp_session;
    const paginatedRecordIds = dataset1.sortedRecordIds.slice(0, dataset1.paging.pageSize);
    const records: IChatRecord[] = [];
    
        for (const id of paginatedRecordIds) {
            const record = dataset1.records[id];
            const AttachmentId = record.getFormattedValue("dyn_attachment");
    
            // Initialize variables for attachment data
            let fileName = '';
            let fileType = '';
    
            if (AttachmentId) {
                try {
                    const fileResponse = await this.context.webAPI.retrieveRecord('dyn_wappmessage', record.getRecordId());
    
                    if (fileResponse) {
                        fileName = fileResponse.dyn_attachment_name;
                        fileType = this.getFileTypeFromFileName(fileName);
                        
                    }
                } catch (error) {
                    console.error('Error fetching attachment data:', error);
                    // Handle error as appropriate
                }
            }
    
            // Create IChatRecord object
            records.push({
                id: record.getRecordId(),
                from: record.getFormattedValue("from"),
                to: record.getFormattedValue("to"),
                description: record.getFormattedValue("description"),
                createdon: record.getFormattedValue("createdon"),
                dyn_direction: record.getFormattedValue("dyn_direction"),
                dyn_attachment: AttachmentId || null, // Use null if no attachment
                fileName: fileName,
                fileType: fileType,
                // Add other fields as needed
            });
        }
        return records;
    };
   
    private renderControl = async (context: ComponentFramework.Context<IInputs>): Promise<void> => {
            const dataset1 = context.parameters.Whatsapp_session;
        if (!dataset1.loading) {
            try {
                // const paginatedRecords = await this.fetchRecords();
                // console.log("Paginated Records:",paginatedRecords)
                const newRecords = await this.fetchRecords();
                this.cumulativeRecords = [...this.cumulativeRecords, ...newRecords];
                const columns1 = dataset1.columns;
                this.datasetEntityType = dataset1.getTargetEntityType();

                const props: IChatDisplayProps = {
                    context: context,
                    columns: columns1,
                    records: this.cumulativeRecords,
                    entityId: this.entityId,
                    formEntityType: this.entityType,
                    datasetEntityType: this.datasetEntityType,
                    loadFirstPage: this.loadFirstPage,
                    hasNextPage: dataset1.paging.hasNextPage,
                    currentPage: this.currentPage,
                    onNextPage: this.onNextPage,
                    // onPreviousPage: this.onPreviousPage
                };

                ReactDOM.render(
                    React.createElement(ChatDisplay, props),
                    this.container
                );
            } catch (error) {
                console.error('Error rendering control:', error);
                // Handle error as appropriate
            }
        }
    }

    public getOutputs(): IOutputs {
        return {}; // Implement output handling if needed
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this.container);
    }
}

