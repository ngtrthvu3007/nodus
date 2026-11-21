export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface DocBacklink {
  id: string;
  title: string;
  path: string;
}

export interface DocLinkTarget {
  id: string;
  title: string;
}

// doc is null for a broken link; the API always sends the key.
export interface DocOutgoing {
  ref: string;
  doc: DocLinkTarget | null;
}

export interface DocLinks {
  backlinks: DocBacklink[];
  outgoing: DocOutgoing[];
}

export interface DocSuggestion {
  id: string;
  title: string;
  path: string;
  // The shortest text that still points to this doc; what the editor inserts.
  ref: string;
}

export interface DocHeading {
  level: HeadingLevel;
  text: string;
}
