import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../store/chatStore';

/**
 * Data Viewer Component for Desktop Split View
 * Shows the full tables/details on the right side
 */
export function DataView() {
    const { activeResult } = useChatStore();

    if (!activeResult) {
        return (
            <div className="data-view-empty">
                <div className="empty-state">
                    <span className="empty-icon">📊</span>
                    <h2>Panel Analisis Data</h2>
                    <p>Tanyakan sesuatu tentang keuangan, penjualan, atau stok untuk menampilkan analisa di sini.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="data-view-content">
            <motion.div
                key={activeResult.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="data-card"
            >
                <div className="data-header">
                    <div className="agent-info">
                        <span className="agent-name">{activeResult.agent}</span>
                        <span className="timestamp">
                            {new Date(activeResult.timestamp).toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>

                <div className="markdown-body">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            table: ({ node, ...props }) => (
                                <div className="table-wrapper">
                                    <table className="data-table" {...props} />
                                </div>
                            ),
                            td: ({ node, children, ...props }) => {
                                const content = String(children || '');
                                const cleanNum = content.replace(/[^0-9,-]/g, '').replace(',', '.');
                                const isNumeric = content.trim() !== '' && !isNaN(parseFloat(cleanNum)) && /^[\dRp\s.,%+-]+$/.test(content);
                                return <td className={isNumeric ? 'num' : ''} {...props}>{children}</td>;
                            }
                        }}
                    >
                        {activeResult.content}
                    </ReactMarkdown>
                </div>

                <div className="data-footer">
                    <span>Processing time: {activeResult.duration}ms</span>
                </div>
            </motion.div>
        </div>
    );
}

export default DataView;
