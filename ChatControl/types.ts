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
