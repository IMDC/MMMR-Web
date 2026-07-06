import { useEffect, useState } from 'react';
import { Share2, Trash2, UserPlus, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { sharingApi } from '../api/sharing';
import { contactsApi } from '../api/contacts';
import Header from '../components/layout/Header';
import { Contact, SharedContent } from '../types';

export default function SharingPage() {
  const [shares, setShares] = useState<SharedContent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'shares' | 'contacts'>('shares');
  const [expandedShare, setExpandedShare] = useState<string | null>(null);

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactType, setContactType] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sharesList, contactsList] = await Promise.all([
        sharingApi.list(),
        contactsApi.list(),
      ]);
      setShares(sharesList || []);
      setContacts(contactsList || []);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await sharingApi.deactivate(id);
    setShares(prev => prev.map(s => s._id === id ? { ...s, isActive: false } : s));
  };

  const handleReactivate = async (id: string) => {
    await sharingApi.reactivate(id);
    setShares(prev => prev.map(s => s._id === id ? { ...s, isActive: true } : s));
  };

  const handleDeleteShare = async (id: string) => {
    await sharingApi.update(id, { isActive: false });
    setShares(prev => prev.filter(s => s._id !== id));
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    setSavingContact(true);
    try {
      await contactsApi.create({
        name: contactName,
        email: contactEmail,
        type: contactType || 'other',
      });
      setContactName('');
      setContactEmail('');
      setContactType('');
      setShowContactForm(false);
      const list = await contactsApi.list();
      setContacts(list || []);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    await contactsApi.delete(id);
    setContacts(prev => prev.filter(c => c._id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Sharing" subtitle="Share your health journal" />

      <div className="flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {(['shares', 'contacts'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-mhmr-olive border-b-2 border-mhmr-olive'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'shares' ? `Shares (${shares.length})` : `Contacts (${contacts.length})`}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : tab === 'shares' ? (
            <>
              {shares.length === 0 ? (
                <div className="text-center py-12">
                  <Share2 size={48} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No shares yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Shares will appear here when you share video data with your care team.
                  </p>
                </div>
              ) : (
                shares.map(share => (
                  <div key={share._id} className="card">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedShare(expandedShare === share._id ? null : share._id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${share.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {share.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">
                            {share.recipients?.length
                              ? share.recipients.map(r => r.name || r.email).join(', ')
                              : 'Shared content'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {share.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      {expandedShare === share._id
                        ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                        : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                    </div>

                    {expandedShare === share._id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {share.permissions && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Permissions</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(share.permissions)
                                .filter(([, v]) => v)
                                .map(([k]) => (
                                  <span key={k} className="tag-pill">{k}</span>
                                ))}
                            </div>
                          </div>
                        )}
                        {share.activities && share.activities.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Recent Activity</p>
                            <div className="space-y-1">
                              {share.activities.slice(0, 3).map((a, i) => (
                                <p key={i} className="text-xs text-gray-600">
                                  <Eye size={10} className="inline mr-1" />
                                  {a.action} — {format(new Date(a.timestamp), 'MMM d, h:mm a')}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {share.isActive ? (
                            <button
                              onClick={() => handleDeactivate(share._id)}
                              className="btn-secondary text-xs py-1.5 px-3"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(share._id)}
                              className="btn-secondary text-xs py-1.5 px-3"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteShare(share._id)}
                            className="btn-danger text-xs py-1.5 px-3"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                Add Contact
              </button>

              {showContactForm && (
                <form onSubmit={handleSaveContact} className="card space-y-3">
                  <h3 className="font-semibold text-gray-800 text-sm">New Contact</h3>
                  <div>
                    <label htmlFor="contact-name" className="text-xs text-gray-500 mb-1 block">Name *</label>
                    <input
                      id="contact-name"
                      type="text"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Dr. Smith"
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="text-xs text-gray-500 mb-1 block">Email</label>
                    <input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="doctor@hospital.com"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-type" className="text-xs text-gray-500 mb-1 block">Type</label>
                    <select
                      id="contact-type"
                      value={contactType}
                      onChange={e => setContactType(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select type</option>
                      <option value="doctor">Doctor</option>
                      <option value="specialist">Specialist</option>
                      <option value="family">Family Member</option>
                      <option value="caregiver">Caregiver</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingContact} className="btn-primary flex-1">
                      {savingContact ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setShowContactForm(false)} className="btn-secondary flex-1">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No contacts yet.</p>
                  <p className="text-sm mt-1">Add your care team members.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div key={contact._id} className="card flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-mhmr-olive/10 flex items-center justify-center shrink-0">
                        <span className="text-mhmr-olive font-bold text-sm">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{contact.name}</p>
                        {contact.type && <p className="text-xs text-gray-500 capitalize">{contact.type}</p>}
                        {contact.email && <p className="text-xs text-gray-400">{contact.email}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteContact(contact._id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        aria-label={`Delete contact ${contact.name}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
