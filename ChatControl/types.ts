import { IInputs } from "./generated/ManifestTypes";

export interface IChatRecord {
    id: string;
    from: string;
    to: string;
    description: string;
    createdon: string;
    dyn_direction: string;
    dyn_attachment: string | null;
    fileName: string;
    fileType: string;
    // Add other fields as needed
}

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