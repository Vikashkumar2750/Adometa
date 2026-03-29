import BlogEditor from '../../BlogEditor';

interface Props { params: { id: string } }

export default function EditBlogPost({ params }: Props) {
    return <BlogEditor postId={params.id} />;
}
