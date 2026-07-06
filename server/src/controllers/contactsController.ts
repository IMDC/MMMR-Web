import { Request, Response } from 'express';
import { Contact } from '../models/Contact';

export async function listContacts(_req: Request, res: Response) {
  const contacts = await Contact.find({ isActive: true }).sort({ name: 1 });
  res.json(contacts);
}

export async function createContact(req: Request, res: Response) {
  const { name, email, type, relationship } = req.body;
  if (!name || !email || !type) {
    return res.status(400).json({ error: 'name, email, and type are required' });
  }

  const contact = await Contact.create({ name, email, type, relationship: relationship || '' });
  res.status(201).json(contact);
}

export async function updateContact(req: Request, res: Response) {
  const allowed = ['name', 'email', 'type', 'relationship'];
  const updates: Record<string, any> = { lastModified: new Date() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const contact = await Contact.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
}

export async function deleteContact(req: Request, res: Response) {
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { isActive: false, lastModified: new Date() },
    { new: true },
  );
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json({ message: 'Contact deactivated' });
}
