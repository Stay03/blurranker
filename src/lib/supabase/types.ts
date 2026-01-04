export type Player = {
  id: string;
  name: string;
  device_id: string;
  created_at: string;
  last_seen: string;
};

export type Session = {
  id: string;
  name: string;
  bet_amount: number;
  creator_id: string;
  status: 'active' | 'archived';
  created_at: string;
  archived_at: string | null;
};

export type SessionPlayer = {
  session_id: string;
  player_id: string;
  joined_at: string;
  is_creator: boolean;
};

export type Game = {
  id: string;
  session_id: string;
  game_number: number;
  status: 'pending' | 'completed';
  created_at: string;
  completed_at: string | null;
};

export type Ranking = {
  id: string;
  game_id: string;
  player_id: string;
  position: number;
  created_at: string;
};

export type GameConfirmation = {
  game_id: string;
  player_id: string;
  confirmed_at: string;
};

export type Payment = {
  id: string;
  session_id: string;
  game_id: string | null;
  from_player_id: string;
  to_player_id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      players: {
        Row: Player;
        Insert: Omit<Player, 'id' | 'created_at' | 'last_seen'> & {
          id?: string;
          created_at?: string;
          last_seen?: string;
        };
        Update: Partial<Player>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at' | 'status' | 'archived_at'> & {
          id?: string;
          created_at?: string;
          status?: 'active' | 'archived';
          archived_at?: string | null;
        };
        Update: Partial<Session>;
      };
      session_players: {
        Row: SessionPlayer;
        Insert: Omit<SessionPlayer, 'joined_at' | 'is_creator'> & {
          joined_at?: string;
          is_creator?: boolean;
        };
        Update: Partial<SessionPlayer>;
      };
      games: {
        Row: Game;
        Insert: Omit<Game, 'id' | 'created_at' | 'status' | 'completed_at'> & {
          id?: string;
          created_at?: string;
          status?: 'pending' | 'completed';
          completed_at?: string | null;
        };
        Update: Partial<Game>;
      };
      rankings: {
        Row: Ranking;
        Insert: Omit<Ranking, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Ranking>;
      };
      game_confirmations: {
        Row: GameConfirmation;
        Insert: Omit<GameConfirmation, 'confirmed_at'> & {
          confirmed_at?: string;
        };
        Update: Partial<GameConfirmation>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at' | 'is_paid' | 'paid_at'> & {
          id?: string;
          created_at?: string;
          is_paid?: boolean;
          paid_at?: string | null;
        };
        Update: Partial<Payment>;
      };
    };
  };
};
