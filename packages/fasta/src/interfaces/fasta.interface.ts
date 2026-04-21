/** A parsed FASTA sequence record containing its header fields and sequence data. */
export interface FastaRecord {
  readonly id: string;
  readonly description: string;
  readonly sequence: string;
}
