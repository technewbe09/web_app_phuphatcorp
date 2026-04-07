import { pool } from '../config/database';

export interface Driver {
  id: number;
  ten_ky_hieu: string;
  ho_ten: string | null;
  lien_he: string | null;
  cccd: string | null;
  ghi_chu: string | null;
  status: 'active' | 'deactive';
  created_at: string;
  updated_at: string;
}

export interface DriverDocument {
  id: number;
  driver_id: number;
  file_name: string;
  mime_type: string | null;
  file_data: string;
  file_size: number | null;
  created_at: string;
}

export interface DriverDocumentMeta {
  id: number;
  driver_id: number;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface CreateDriverData {
  ten_ky_hieu: string;
  ho_ten?: string | null;
  lien_he?: string | null;
  cccd?: string | null;
  ghi_chu?: string | null;
}

export interface UploadDocumentData {
  file_name: string;
  mime_type?: string | null;
  file_data: string;
  file_size?: number | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export const driverService = {
  async list(): Promise<Driver[]> {
    const result = await pool.query<Driver>(
      `SELECT id, ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu, status, created_at, updated_at
       FROM drivers
       WHERE status = 'active'
       ORDER BY ten_ky_hieu ASC`,
    );
    return result.rows;
  },

  async findById(id: number): Promise<Driver | null> {
    const result = await pool.query<Driver>(
      `SELECT id, ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu, status, created_at, updated_at
       FROM drivers WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async findByTenKyHieu(ten_ky_hieu: string): Promise<Driver | null> {
    const result = await pool.query<Driver>(
      `SELECT id FROM drivers WHERE ten_ky_hieu = $1 LIMIT 1`,
      [ten_ky_hieu],
    );
    return result.rows[0] || null;
  },

  async create(data: CreateDriverData): Promise<Driver> {
    const existing = await this.findByTenKyHieu(data.ten_ky_hieu);
    if (existing) {
      throw { code: 'DUPLICATE_TEN_KY_HIEU', ten_ky_hieu: data.ten_ky_hieu };
    }

    const result = await pool.query<Driver>(
      `INSERT INTO drivers (ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu, status, created_at, updated_at`,
      [data.ten_ky_hieu, data.ho_ten ?? null, data.lien_he ?? null, data.cccd ?? null, data.ghi_chu ?? null],
    );
    return result.rows[0];
  },

  async update(id: number, data: CreateDriverData): Promise<Driver> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    // If ten_ky_hieu changed, check for duplicate
    if (data.ten_ky_hieu !== existing.ten_ky_hieu) {
      const duplicate = await this.findByTenKyHieu(data.ten_ky_hieu);
      if (duplicate) {
        throw { code: 'DUPLICATE_TEN_KY_HIEU', ten_ky_hieu: data.ten_ky_hieu };
      }
    }

    const result = await pool.query<Driver>(
      `UPDATE drivers
       SET ten_ky_hieu = $1, ho_ten = $2, lien_he = $3, cccd = $4, ghi_chu = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, ten_ky_hieu, ho_ten, lien_he, cccd, ghi_chu, status, created_at, updated_at`,
      [data.ten_ky_hieu, data.ho_ten ?? null, data.lien_he ?? null, data.cccd ?? null, data.ghi_chu ?? null, id],
    );
    return result.rows[0];
  },

  async softDelete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.status !== 'active') {
      throw { code: 'NOT_FOUND' };
    }

    await pool.query(
      `UPDATE drivers SET status = 'deactive', updated_at = NOW() WHERE id = $1`,
      [id],
    );
  },

  async getDocuments(driverId: number): Promise<DriverDocumentMeta[]> {
    const driver = await this.findById(driverId);
    if (!driver) {
      throw { code: 'NOT_FOUND' };
    }

    const result = await pool.query<DriverDocumentMeta>(
      `SELECT id, driver_id, file_name, mime_type, file_size, created_at
       FROM driver_documents
       WHERE driver_id = $1
       ORDER BY created_at DESC`,
      [driverId],
    );
    return result.rows;
  },

  async uploadDocument(driverId: number, doc: UploadDocumentData): Promise<DriverDocumentMeta> {
    const driver = await this.findById(driverId);
    if (!driver) {
      throw { code: 'NOT_FOUND' };
    }

    if (doc.file_size && doc.file_size > MAX_FILE_SIZE) {
      throw { code: 'FILE_TOO_LARGE' };
    }

    const result = await pool.query<DriverDocumentMeta>(
      `INSERT INTO driver_documents (driver_id, file_name, mime_type, file_data, file_size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, driver_id, file_name, mime_type, file_size, created_at`,
      [driverId, doc.file_name, doc.mime_type ?? null, doc.file_data, doc.file_size ?? null],
    );
    return result.rows[0];
  },

  async deleteDocument(driverId: number, docId: number): Promise<void> {
    const result = await pool.query(
      `DELETE FROM driver_documents WHERE id = $1 AND driver_id = $2`,
      [docId, driverId],
    );
    if (result.rowCount === 0) {
      throw { code: 'NOT_FOUND' };
    }
  },

  async downloadDocument(driverId: number, docId: number): Promise<DriverDocument> {
    const result = await pool.query<DriverDocument>(
      `SELECT id, driver_id, file_name, mime_type, file_data, file_size, created_at
       FROM driver_documents
       WHERE id = $1 AND driver_id = $2`,
      [docId, driverId],
    );
    if (!result.rows[0]) {
      throw { code: 'NOT_FOUND' };
    }
    return result.rows[0];
  },
};
