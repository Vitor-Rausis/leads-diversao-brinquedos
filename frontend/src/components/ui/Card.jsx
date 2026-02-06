import clsx from 'clsx';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={clsx('bg-white rounded-xl shadow-sm border border-gray-100', className)}
      {...props}
    >
      {children}
    </div>
  );
}
