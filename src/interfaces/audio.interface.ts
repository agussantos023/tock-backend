export interface AudioTags {
  title?: string;
  artist?: string;
  album?: string;
  date?: string;
}

export interface AudioMetadata {
  format: {
    duration?: number;
    tags?: AudioTags;
  };
}
